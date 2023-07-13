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
  config: MxbiConfig;

  constructor(
    abiPath: string,
    folderPath: string,
    needInputAddress: string[],
    mxbiConfig: MxbiConfig,
  ) {
    const jsonContent = fs.readFileSync(abiPath, { encoding: 'utf8' });
    this.jsonAbi = JSON.parse(jsonContent);
    this.config = mxbiConfig;
    this.name = utils.generateVariableName(
      this.jsonAbi.buildInfo.contractCrate.name,
    );
    this.folderPath = folderPath;
    this.needInputAddress = needInputAddress.includes(this.name);

    let fns = this.generateFuncsBody();

    this.resolverFns = fns[1];
    this.serviceFns = fns[0];
    this.defaultWarmer = fns[2];

    if (this.serviceFns.length == 0) {
      this.isEmpty = true;
    }

    this.customWarmer = mxbiConfig.getCustomWarmerFns(this.name);
    this.disableWarmersFns(mxbiConfig.needRemoveWarmer(this.name));
  }

  get_name(): string {
    return this.name;
  }

  getIsEmpty(): boolean {
    return this.isEmpty;
  }

  disableWarmersFns(disable_warmers: string[]) {
    this.defaultWarmer = this.defaultWarmer.filter(
      (name) => !disable_warmers.includes(name),
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

  generateFuncsBody(): [string, string, string[]] {
    let servicefns: string[] = [];
    let resolverfns: string[] = [];
    let defaultWarmer: string[] = [];

    let variableName = utils.generateVariableName(this.name);
    let className = utils.generateClassName(this.name);
    const queries = this.jsonAbi.endpoints.filter(
      (endpoint: any) => endpoint.mutability === 'readonly',
    );
    queries.forEach((endpoint: any) => {
      let args: string[] = [];
      let resolverArgs: string[] = [];
      let passingParams: string[] = [];
      let serviceCustomBody = '';
      let cacheKey = 'generateHash(JSON.stringify(args))';
      if (this.needInputAddress) {
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
          return `${inputName}: ${utils.abiTypeMapping(
            input.type,
            utils.TypeMapping.Typescript,
            true,
          )} `;
        }),
      );

      if (args.length == 0) {
        defaultWarmer.push(endpoint.name);
      }

      resolverArgs = resolverArgs.concat(
        endpoint.inputs.map((input: any) => {
          return `@Args('${input.name}') ${
            input.name + 'Args'
          }: ${utils.abiTypeMapping(
            input.type,
            utils.TypeMapping.Typescript,
            true,
          )} `;
        }),
      );

      passingParams = passingParams.concat(
        endpoint.inputs.map((input: any) => {
          let inputName = input.name + 'Args';
          return `${inputName}`;
        }),
      );

      let returnValue = utils.parserMapping(
        endpoint.outputs[0]?.type,
        this.jsonAbi,
        utils.TypeMapping.Typescript,
      );

      let cacheEnable = this.config.isCacheEnable(this.name, endpoint.name);
      let classNameType = utils.abiTypeMapping(
        endpoint.outputs[0]?.type,
        utils.TypeMapping.Typescript,
      );
      let ttl = this.config.redisTtl(this.name, endpoint.name) ?? 6;
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
  ${
    cacheEnable
      ? `const cacheInfo = CacheInfo.generateCacheInfo(
          "${this.name}",
          "${endpoint.name}",
          ${cacheKey}
    );
    await this.cachingService.setCacheRemote(
      cacheInfo.key,
      ${returnValue},
      ${ttl} 
    );`
      : ''
  }

return ${returnValue};
} \n
  `;

      if (this.needInputAddress) {
        passingParams = ['address'].concat(passingParams);
      }
      let resolverFns = `
@ResolveField()
async ${endpoint.name}(${resolverArgs.join(',')}) {
    ${
      this.needInputAddress
        ? `const address = String(${variableName}.address);`
        : ''
    }
    const args: any = [${passingParams.join(',')}];

    ${
      cacheEnable
        ? `const result =
      (await this.cachingService.getCacheRemote<${classNameType}>(
        CacheInfo.generateCacheInfo(
          "${this.name}",
          "${endpoint.name}",
          ${cacheKey}
        ).key
      )) ??
      (await this.${variableName}Service.${endpoint.name}(${passingParams}));`
        : `const result = await this.${variableName}Service.${endpoint.name}(${passingParams})`
    }

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
}
