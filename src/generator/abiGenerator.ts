import * as fs from 'fs';
import {
  AbiRegistry,
  EndpointDefinition,
  Interaction,
} from '@multiversx/sdk-core/out';
import * as utils from '../utils';
import { generateAbiModuleFn } from './endpoints/endpoints.module';
import { generateAbiServiceFn } from './endpoints/endpoints.service';
import { generateResolverFn } from './endpoints/endpoints.resolver';
import { generateContractModel } from './graphqh/graphql.schema';
import { endianness } from 'os';

export class AbiGenerator {
  folderPath: string;
  name: string;
  serviceFns: string;
  resolverFns: string;

  constructor(abiPath: string, folderPath: string) {
    const jsonContent = fs.readFileSync(abiPath, { encoding: 'utf8' });
    const json = JSON.parse(jsonContent);
    const registry = AbiRegistry.create(json);
    this.name = utils.convertDashToCamelCase(json.buildInfo.contractCrate.name);
    this.folderPath = `${folderPath}/${this.name}`;

    if (!fs.existsSync(this.folderPath)) {
      fs.mkdirSync(this.folderPath);
    }

    generateContractModel(json, this.folderPath, this.name);
    let fns = generateFuncsBody(json, this.name);

    this.resolverFns = fns[1];
    this.serviceFns = fns[0];
  }

  generate(): string {
    generateAbiModuleFn(this.folderPath, this.name);
    generateAbiServiceFn(this.folderPath, this.name, this.serviceFns);
    generateResolverFn(this.folderPath, this.name, this.resolverFns);
    console.log(`folder ${this.folderPath} is generated`);

    return this.name;
  }
}

function isCustomType(name: String, type: string, json: any): boolean {
  return Object.entries(json.types).filter(
    ([typeName, typeData]: [string, any]) => {
      if (typeName === name.trim().split('.')[1] && typeData.type == type) {
        return true;
      }
      return false;
    },
  ).length > 0
    ? true
    : false;
}

export function generateFuncsBody(json: any, name: string): [string, string] {
  let servicefns: string[] = [];
  let resolverfns: string[] = [];
  const queries = json.endpoints.filter(
    (endpoint: any) => endpoint.mutability === 'readonly',
  );
  queries.forEach((endpoint: any) => {
    const args = endpoint.inputs
      .map((input: any) => {
        return `${input.name}: ${typeMappingForTsFunction(input.type, true)} `;
      })
      .join(', ');

    const resolverArgs = endpoint.inputs
      .map((input: any) => {
        return `@Args('${input.name}') ${input.name
          }: ${typeMappingForTsFunction(input.type, true)} `;
      })
      .join(', ');

    const passingParams = endpoint.inputs
      .map((input: any) => {
        return `${input.name}`;
      })
      .join(', ');

    let variableName = utils.removeUnderScore(name);
    let returnValue = parserMapping(endpoint.outputs[0]?.type, json);
    let serviceFns = `
async ${endpoint.name}(${args})${`: Promise<${typeMappingForTsFunction(endpoint.outputs[0]?.type) || 'Boolean'
      }> {`}
const args: any = [${passingParams}];
const interaction: any = this.sm.methods.${endpoint.name}(args);
const query = interaction.check().buildQuery();
const queryResponse: any = await this.provider.queryContract(query);

//Handle Parser
const { firstValue } = new ResultsParser().parseQueryResponse(
  queryResponse,
  interaction.getEndpoint()
);

//Handle Parser
    let cacheInfo = CacheInfo.generateCacheInfo(
          "${name}",
          "${endpoint.name}",
          generateHash(JSON.stringify(args))
    );
    this.cachingService.setCacheRemote(
      cacheInfo.key,
      ${returnValue},
      cacheInfo.ttl
    );

return ${returnValue};
} \n
  `;

    let resolverFns = `
@ResolveField()
async ${endpoint.name} (${resolverArgs}) {
    const args: any = [${passingParams}];

    const result =
      (await this.cachingService.getCacheRemote<string>(
        CacheInfo.generateCacheInfo(
          "${name}",
          "${endpoint.name}",
          generateHash(JSON.stringify(args))
        ).key
      )) ??
      (await this.${variableName}Service.${endpoint.name}(${passingParams}));
  if (!result) {
    throw new NotFoundException('Result not found');
  }

  return result;
}
`;
    servicefns.push(serviceFns);
    resolverfns.push(resolverFns);
  });
  return [servicefns.join('\n'), resolverfns.join('\n')];
}

export function parserMapping(type: string, json: any): string {
  if (isCustomType(typeMappingForTsFunction(type), 'enum', json)) {
    return 'firstValue?.valueOf().name';
  } else if (type == 'Address') {
    return 'firstValue?.valueOf().bech32()';
  } else {
    return 'firstValue?.valueOf()';
  }
}

export function typeMappingForTsFunction(
  type: string,
  isArgs: boolean = false,
): string {
  type = type.trim();
  if (type == '[bytes]') {
    return 'String';
  }

  if (type.includes('List')) {
    const result = `[${typeMappingForTsFunction(
      utils.listStringToArray(type),
      isArgs,
    )}]`;
    return typeMappingForTsFunction(result, isArgs);
  } else if (type.includes('variadic')) {
    const result = `[${typeMappingForTsFunction(
      utils.variadicStringToArray(type),
      isArgs,
    )}]`;
    return typeMappingForTsFunction(result, isArgs);
  } else if (type.includes('multi')) {
    const result = utils.multiToObject(type);
    return typeMappingForTsFunction(result);
  } else if (type.includes('tuple')) {
    const result = utils.tupleToObject(type);
    return typeMappingForTsFunction(result);
  } else {
    switch (type) {
      case 'BigInt':
      case 'BigUIntType':
      case 'BigUint':
      case 'TokenIdentifierType':
      case 'TokenIdentifier':
      case 'LockedBalance':
      case 'Address':
      case 'bytes':
      case 'string':
        return 'string';
      case 'bool':
        return 'boolean';
      case 'u128':
      case 'u64':
      case 'u32':
      case 'u8':
        return 'number';
      default:
        if (type.includes('[')) {
          return type;
        }
        if (isArgs) {
          return `gqlModel.${type}Input`;
        }

        return `gqlModel.${type}`;
    }
  }
}
