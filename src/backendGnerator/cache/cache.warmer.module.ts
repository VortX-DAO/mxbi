import * as utils from '../../utils';

export function generateCacheWarmerModule(service_names: string[]) {
  let importServiceFile = service_names.map((x) => {
    let className = utils.generateClassName(x);
    let variableName = utils.generateVariableName(x);
    return `import { ${className}CacheWarmerService } from './${variableName}.warmer.service';`;
  });

  let listServices = service_names.map((x) => {
    let className = utils.generateClassName(x);
    return `${className}CacheWarmerService`;
  });

  let filePath = 'src/crons/cache.warmer/cache.warmer.module.ts';
  let content = `/* eslint-disable eol-last */
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EndpointsServicesModule } from 'src/endpoints/endpoints.services.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
  ${importServiceFile.join('\n')}

  @Module({
    imports: [ScheduleModule.forRoot(), EndpointsServicesModule],
    providers: [
      DynamicModuleUtils.getPubSubService(),
      ${listServices.join(',')}
    ],
  })
  export class CacheWarmerModule {}
    `;

  utils.writeFile(filePath, content);
}
