import * as fs from 'fs';
import * as utils from '../utils';
import * as endpointsGenerator from './endpoints/';
import * as userCustomGenerator from './userCustom/';
import * as graphqlGenerator from './graphqh/';
import * as warmer from './cache';
import { Function, MxbiConfig } from '../config';

export class AbiGenerator {
  folderPath: string;
  name: string;
  serviceFns: string;
  resolverFns: string;
  jsonAbi: any;
  defaultWarmer: string[];
  needInputAddress: boolean;
  customWarmer: Function[];
  isEmpty = false;

  constructor(
    abiPath: string,
    folderPath: string,
    needInputAddress: string[],
    mxbiConfig: MxbiConfig,
  ) {
    const jsonContent = fs.readFileSync(abiPath, { encoding: 'utf8' });
    this.jsonAbi = JSON.parse(jsonContent);
    this.name = utils.generateVariableName(
      this.jsonAbi.buildInfo.contractCrate.name,
    );
    this.folderPath = folderPath;
    this.needInputAddress = needInputAddress.includes(this.name);

    this.customWarmer = mxbiConfig.functions.filter((v) => {
      return v.abi_name?.trim() == this.name.trim();
    });

    let fns = generateFuncsBody(this.jsonAbi, this.name, this.needInputAddress);

    this.resolverFns = fns[1];
    this.serviceFns = fns[0];
    this.defaultWarmer = fns[2];

    if (this.serviceFns.length == 0) {
      this.isEmpty = true;
    }
  }

  get_name(): string {
    return this.name;
  }

  getIsEmpty(): boolean {
    return this.isEmpty;
  }

  disableCacheFns(disable_cache: string[]) {
    this.defaultWarmer = this.defaultWarmer.filter(
      (name) => !disable_cache.includes(name),
    );
  }

  upgrade_backend() {
    let generatedFolderPath = `${this.folderPath}/endpoints/${this.name}/generated`;
    //generated Folder
    endpointsGenerator.generateAbiServiceFn(
      generatedFolderPath,
      this.name,
      this.serviceFns,
      this.needInputAddress,
      warmer.generateCacheWarmerFunction(this.defaultWarmer, this.customWarmer),
    );
    endpointsGenerator.generateResolverFn(
      generatedFolderPath,
      this.name,
      this.resolverFns,
      this.needInputAddress,
    );

    graphqlGenerator.generateContractModel(
      this.jsonAbi,
      generatedFolderPath,
      this.name,
      this.needInputAddress,
    );
    warmer.generateAbiCacheWarmerService(this.name, this.folderPath);
  }
  generate_new_backend() {
    let generatedFolderPath = `${this.folderPath}/endpoints/${this.name}/generated`;

    let endpointFolderPath = `${this.folderPath}/endpoints/${this.name}`;
    if (!fs.existsSync(endpointFolderPath)) {
      fs.mkdirSync(endpointFolderPath, {
        recursive: true,
      });
      fs.mkdirSync(endpointFolderPath + '/generated', {
        recursive: true,
      });
    }

    graphqlGenerator.generateContractModel(
      this.jsonAbi,
      generatedFolderPath,
      this.name,
      this.needInputAddress,
    );
    //generated Folder
    endpointsGenerator.generateAbiServiceFn(
      generatedFolderPath,
      this.name,
      this.serviceFns,
      this.needInputAddress,
      warmer.generateCacheWarmerFunction(this.defaultWarmer, this.customWarmer),
    );
    endpointsGenerator.generateResolverFn(
      generatedFolderPath,
      this.name,
      this.resolverFns,
      this.needInputAddress,
    );

    //UserCustom Folder
    userCustomGenerator.generateCustomModuleFn(endpointFolderPath, this.name);
    userCustomGenerator.generateCustomServiceFn(endpointFolderPath, this.name);
    userCustomGenerator.generateCustomResolverFn(
      endpointFolderPath,
      this.name,
      this.needInputAddress,
    );
    //Graphql
    graphqlGenerator.graphqlTemplate(endpointFolderPath, this.name);
    warmer.generateAbiCacheWarmerService(this.name, this.folderPath);
  }
}

export function generateFuncsBody(
  json: any,
  name: string,
  needInputAddress: boolean,
): [string, string, string[]] {
  let servicefns: string[] = [];
  let resolverfns: string[] = [];
  let defaultWarmer: string[] = [];
  let variableName = utils.generateVariableName(name);
  let className = utils.generateClassName(name);
  const queries = json.endpoints.filter(
    (endpoint: any) => endpoint.mutability === 'readonly',
  );
  queries.forEach((endpoint: any) => {
    let args: string[] = [];
    let resolverArgs: string[] = [];
    let passingParams: string[] = [];
    let serviceCustomBody = '';
    let cacheKey = 'generateHash(JSON.stringify(args))';
    if (needInputAddress) {
      args.push(`address: string`);
      resolverArgs.push(`@Parent() ${variableName}: gqlModel.${className}`);
      serviceCustomBody = `const contract = new SmartContract({
      address: new Address(address),
        abi: this.getAbiRegistry(this.abiPath) as AbiRegistry,
    });
  const interaction: any = contract.methods.${endpoint.name}(args);
  `;
      cacheKey = 'generateHash(JSON.stringify(args)).concat(address)';
    } else {
      serviceCustomBody = `const interaction: any = this.sm.methods.${endpoint.name}(args);`;
    }

    args = args.concat(
      endpoint.inputs.map((input: any) => {
        let inputName = input.name + 'Args';
        return `${inputName}: ${utils.abiTypeMapping(input.type, true, true)} `;
      }),
    );

    if (args.length == 0) {
      defaultWarmer.push(endpoint.name);
    }

    resolverArgs = resolverArgs.concat(
      endpoint.inputs.map((input: any) => {
        return `@Args('${input.name}') ${
          input.name + 'Args'
        }: ${utils.abiTypeMapping(input.type, true, true)} `;
      }),
    );

    passingParams = passingParams.concat(
      endpoint.inputs.map((input: any) => {
        let inputName = input.name + 'Args';
        return `${inputName}`;
      }),
    );

    // let returnValue = '';
    // if (endpoint.outputs[0]?.type == 'Address') {
    //   returnValue = `${utils.parserMapping(
    //     endpoint.outputs[0]?.type,
    //     json,
    //     true,
    //   )}.bech32()`;
    // } else {
    let returnValue = utils.parserMapping(
      endpoint.outputs[0]?.type,
      json,
      true,
    );
    // }

    let classNameType = utils.abiTypeMapping(endpoint.outputs[0]?.type, true);
    let serviceFns = `
async ${endpoint.name}(${args.join(',')})${`: Promise<${
      classNameType || 'Boolean'
    }> {`}
const args: any = [${passingParams.join(',')}];
${serviceCustomBody}
const query = interaction.check().buildQuery();
const queryResponse: any = await this.provider.queryContract(query);

//Handle Parser
const { firstValue } = new ResultsParser().parseQueryResponse(
  queryResponse,
  interaction.getEndpoint()
);

//Handle Parser
   const cacheInfo = CacheInfo.generateCacheInfo(
          "${name}",
          "${endpoint.name}",
          ${cacheKey}
    );
    await this.cachingService.setCacheRemote(
      cacheInfo.key,
      ${returnValue},
      cacheInfo.ttl
    );

return ${returnValue};
} \n
  `;

    if (needInputAddress) {
      passingParams = ['address'].concat(passingParams);
    }
    let resolverFns = `
@ResolveField()
async ${endpoint.name}(${resolverArgs.join(',')}) {
    ${
      needInputAddress ? `const address = String(${variableName}.address);` : ''
    }
    const args: any = [${passingParams.join(',')}];

    const result =
      (await this.cachingService.getCacheRemote<${classNameType}>(
        CacheInfo.generateCacheInfo(
          "${name}",
          "${endpoint.name}",
          ${cacheKey}
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
  return [servicefns.join('\n'), resolverfns.join('\n'), defaultWarmer];
}
