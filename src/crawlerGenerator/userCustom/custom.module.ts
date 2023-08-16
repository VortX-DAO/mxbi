import * as utils from '../../utils';

export function generateCustomModuleFn(folderPath: string, name: string) {
  // console.log('Generate *.module File');
  let className = utils.generateClassName(name);
  let moduleFilePath = `${folderPath}/${name}.module.ts`;
  let moduleContent = `/* eslint-disable eol-last */
import { Module } from "@nestjs/common";
import { ApiConfigModule } from "src/common/api-config/api.config.module";
import { DynamicModuleUtils } from "src/utils/dynamic.module.utils";
import { GeneratedService } from './generated/generated.service';
import {
  GeneratedResolver,
  QueryGeneratedResolver,
} from './generated/generated.resolver';
import { ${className}Service } from "./${name}.service";
import { ${className}Resolver, Query${className}Resolver } from "./${name}.resolver";

@Module({
  imports: [
    ApiConfigModule,
    DynamicModuleUtils.getCachingModule(),
  ],
  providers: [
    GeneratedService,
    GeneratedResolver,
    QueryGeneratedResolver,
    ${className}Service, ${className}Resolver, Query${className}Resolver
  ],
  exports: [
    GeneratedService,
    GeneratedResolver,
    QueryGeneratedResolver,
   ${className}Service, ${className}Resolver, Query${className}Resolver
  ],
})
export class ${className}Module { } 
  `;
  utils.writeFile(moduleFilePath, moduleContent);
}
