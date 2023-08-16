import * as utils from '../../utils';

export function generateAbiServiceFn(
  folderPath: string,
  name: string,
  serviceFns: string,
  needInputAddress: boolean,
  warmerFn: string,
) {
  let className = utils.generateClassName(name);
  let serviceFilePath = `${folderPath}/generated.service.ts`;
  let constructorFn = '';
  if (needInputAddress) {
    constructorFn = `
  provider: any;
  abiPath: any;

  constructor(
    private readonly apiConfigService: ApiConfigService,
    private readonly cachingService: CachingService,
  ) {
    const abiPath = this.apiConfigService.getContractAbiPath("${name}")[0];
    const provider = this.apiConfigService.getApiUrl();
    const abi = this.getAbiRegistry(abiPath);
    if (abi != undefined) {
      this.abiPath = abiPath;
      this.provider = new ApiNetworkProvider(provider);
    }
  }
`;
  } else {
    constructorFn = `
  provider: any;
  sm: any;
  constructor(
    private readonly apiConfigService: ApiConfigService,
    private readonly cachingService: CachingService
  ) {
    const abiPath = this.apiConfigService.getContractAbiPath("${name}")[0];
    const contractAddress = this.apiConfigService.getContractAddress("${name}")[0];
    const provider = this.apiConfigService.getApiUrl();
    const abi = this.getAbiRegistry(abiPath);
    if (abi != undefined) {
      this.sm = new SmartContract({
        address: new Address(contractAddress),
        abi: this.getAbiRegistry(abiPath) as AbiRegistry,
      });
      this.provider = new ApiNetworkProvider(provider);
    }
  }
`;
  }
  let serviceContent = `/* eslint-disable eol-last */
import { AbiRegistry, Address, SmartContract, ResultsParser } from '@multiversx/sdk-core/out';
import { CachingService } from "@multiversx/sdk-nestjs";
import { CacheInfo, generateHash } from "src/utils/cache.info";
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers/out';
import { Injectable } from '@nestjs/common';
import * as gqlModel from "../../../graphql/graphql";
import { ApiConfigService } from "src/common/api-config/api.config.service";
import fs from 'fs';

@Injectable()
export class GeneratedService {
  ${constructorFn}

  ${warmerFn}

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
