import * as utils from '../../utils';
export function generateResolverFn(
  folderPath: string,
  name: string,
  resolverFns: string,
) {
  let className = utils.snakeCaseToCamelCase(name);
  let variableName = utils.removeUnderScore(name);
  let resolverFilePath = `${folderPath}/${name}.resolver.ts`;
  let resolverContent = `/* eslint-disable eol-last */
import { NotFoundException } from "@nestjs/common";
import { CachingService } from "@multiversx/sdk-nestjs";
import { CacheInfo, generateHash } from "src/utils/cache.info";
import { ${className}Service } from './${name}.service';
import { Args, Query, Resolver, ResolveField } from "@nestjs/graphql";
import * as gqlModel from "../../graphql/graphql";

@Resolver(() => gqlModel.${className})
export class ${className}Resolver {

  constructor(
    private readonly ${variableName}Service: ${className}Service,
    private readonly cachingService: CachingService
  ) {}
  // Generate ABI view functions
  ${resolverFns}
}

@Resolver(() => Query)
export class Query${className}Resolver {
  @Query(() => gqlModel.${className})
  ${variableName}(): gqlModel.${className}{
    return new gqlModel.${className}();
  }
}
  `;
  utils.writeFile(resolverFilePath, resolverContent);
}
