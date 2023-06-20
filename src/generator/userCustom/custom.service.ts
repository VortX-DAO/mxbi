import * as utils from '../../utils';

export function generateCustomServiceFn(folderPath: string, name: string) {
  let className = utils.generateClassName(name);
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
export class ${className}Service {}
  `;
  utils.writeFile(serviceFilePath, serviceContent);
}
