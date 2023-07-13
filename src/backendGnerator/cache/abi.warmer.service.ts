import { Function } from '../../config';
import * as utils from '../../utils';

export function generateAbiCacheWarmerService(name: string, path: string) {
  let className = utils.generateClassName(name);
  let variableName = utils.generateVariableName(name);
  let filePath = `${path}/crons/cache.warmer/${variableName}.warmer.service.ts`;
  let content = `/* eslint-disable eol-last */
 import { Injectable } from '@nestjs/common';
 import { Cron } from '@nestjs/schedule';
 import { GeneratedService } from '../../endpoints/${variableName}/generated/generated.service';
 import { Locker } from '@multiversx/sdk-nestjs';

@Injectable()
export class ${className}CacheWarmerService {
  constructor(private readonly ${variableName}Service: GeneratedService) {}

  @Cron('* * * * * *')
  async handleCacheValidiation() {
    await Locker.lock(
      'Refreshing lqash cache validation',
      async () => {
        await this.${variableName}Service.cacheWarmer();
      },
      true,
    );
  }
}
    `;
  utils.writeFile(filePath, content);
}

export function generateCacheWarmerFunction(
  fnNames: string[],
  customWarmers: Function[],
): string {
  //Handle empty arguments functions
  let defaults = fnNames.map((x) => `this.${x}()`);

  let customs: string[] = customWarmers
    .map((func: any) => {
      return func.default_args?.map((arg: Record<string, any>) => {
        let functionName = func.name;
        let args = Object.entries(arg)
          .map(([_, value]) => (isNaN(value) ? `"${value}"` : value))
          .join(', ');

        // Construct the string
        return `this.${functionName}(${args})`;
      });
    })
    .flat();

  defaults = defaults.concat(customs).filter((item) => item !== undefined);
  return `
  async cacheWarmer() {
      ${
        defaults.length > 0 ? `await Promise.all([${defaults.join(',')}]);` : ''
      }
  }`;
}
