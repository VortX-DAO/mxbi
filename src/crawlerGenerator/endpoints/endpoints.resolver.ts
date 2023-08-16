import * as utils from '../../utils';
export function generateResolverFn(
  folderPath: string,
  name: string,
  resolverFns: string,
  needInputAddress: boolean,
) {
  let className = utils.generateClassName(name);
  let variableName = utils.generateVariableName(name);
  let resolverFilePath = `${folderPath}/generated.resolver.ts`;
  let resolverContent = `/* eslint-disable eol-last */
import { NotFoundException } from "@nestjs/common";
import { CachingService } from "@multiversx/sdk-nestjs";
import { CacheInfo, generateHash } from "src/utils/cache.info";
import { GeneratedService } from './generated.service';
import { Args, Query, Resolver, ResolveField, Parent } from "@nestjs/graphql";
import * as gqlModel from "../../../graphql/graphql";

@Resolver(() => gqlModel.${className})
export class GeneratedResolver {

  constructor(
    private readonly ${variableName}Service: GeneratedService,
    private readonly cachingService: CachingService
  ) {}
  // Generate ABI view functions
  ${resolverFns}
}

@Resolver(() => Query)
export class QueryGeneratedResolver {
  @Query(() => gqlModel.${className})
  ${variableName}(${
    needInputAddress ? "@Args('address') address: string" : ''
  }): gqlModel.${className} {
  const ${variableName} = new gqlModel.${className}();
  ${needInputAddress ? `${variableName}.address = address;` : ''}
  return ${variableName};
  }
}
`;
  utils.writeFile(resolverFilePath, resolverContent);
}
