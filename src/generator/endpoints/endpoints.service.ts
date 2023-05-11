import * as utils from '../../utils';

export function generateAbiServiceFn(
  folderPath: string,
  name: string,
  serviceFns: string,
) {
  let className = utils.snakeCaseToCamelCase(name);
  let variableName = utils.removeUnderScore(name);

  let serviceFilePath = `${folderPath}/${name}.service.ts`;
  let serviceContent = `/* eslint-disable eol-last */
import { AbiRegistry, Address, SmartContract, ResultsParser } from '@multiversx/sdk-core/out';
import { CachingService } from "@multiversx/sdk-nestjs";
import { CacheInfo, generateHash } from "src/utils/cache.info";
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers/out';
import { Injectable } from '@nestjs/common';
import * as gqlModel from "../../graphql/graphql";
import { ApiConfigService } from "src/common/api-config/api.config.service";
import fs from 'fs';

@Injectable()
export class ${className}Service {
  provider: any;
  sm: any;
  constructor(
    private readonly apiConfigService: ApiConfigService,
    private readonly cachingService: CachingService
  ) {
    let abiPath = this.apiConfigService.getContractAbiPath("${name}")[0];
    let contractAddress = this.apiConfigService.getContractAddress("${name}")[0];
    let provider = this.apiConfigService.getApiUrl();
    const abi = this.getAbiRegistry(abiPath);
    if (abi != undefined) {
      this.sm = new SmartContract({
        address: new Address(contractAddress),
        abi: this.getAbiRegistry(abiPath) as AbiRegistry,
      });
      this.provider = new ApiNetworkProvider(provider);
    }
  }

  getAbiRegistry(path: string): AbiRegistry | undefined {
    const data = fs.readFileSync(path, { encoding: 'utf-8' });
    return AbiRegistry.create(JSON.parse(data));
  }

  // Generate ABI view functions
  ${serviceFns}
}
  `;
  utils.writeFile(serviceFilePath, serviceContent);
}
