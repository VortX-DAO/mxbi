import * as utils from '../../utils';

export function generateEndpointServicesModule(
  importServiceFile: string,
  listServices: string,
) {
  let endpointsServicesFilePath = 'src/endpoints/endpoints.services.module.ts';
  let endpointsServicesContent = `/* eslint-disable eol-last */
  import { Module } from '@nestjs/common';
  import { GeneralModule } from './general/general.module';
  ${importServiceFile}

  @Module({
    imports: [GeneralModule, ${listServices}],
    exports: [GeneralModule, ${listServices}],
  })
  export class EndpointsServicesModule {}
    `;
  utils.writeFile(endpointsServicesFilePath, endpointsServicesContent);
}
