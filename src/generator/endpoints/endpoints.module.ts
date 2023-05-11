import * as utils from '../../utils';

export function generateAbiModuleFn(folderPath: string, name: string) {
  console.log('Generate *.module File');
  let className = utils.snakeCaseToCamelCase(name);
  let variableName = utils.removeUnderScore(name);
  // Create *.module.ts file
  let moduleFilePath = `${folderPath}/${name}.module.ts`;
  let moduleContent = `/* eslint-disable eol-last */
import { Module } from "@nestjs/common";
import { ApiConfigModule } from "src/common/api-config/api.config.module";
import { DynamicModuleUtils } from "src/utils/dynamic.module.utils";
import { ${className}Service } from "./${name}.service";
import { ${className}Resolver, Query${className}Resolver } from "./${name}.resolver";

@Module({
  imports: [
    ApiConfigModule,
    DynamicModuleUtils.getCachingModule(),
  ],
  providers: [
    ${className}Service, ${className}Resolver, Query${className}Resolver
  ],
  exports: [ ${className}Service, ${className}Resolver, Query${className}Resolver
  ],
})
export class ${className}Module { } 
  `;
  utils.writeFile(moduleFilePath, moduleContent);
}
