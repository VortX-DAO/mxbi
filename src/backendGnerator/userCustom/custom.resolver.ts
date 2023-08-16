import * as utils from '../../utils';

export function generateCustomResolverFn(
  folderPath: string,
  name: string,
  needInputAddress: boolean,
) {
  let className = utils.generateClassName(name);
  let variableName = utils.generateVariableName(name);
  let resolverFilePath = `${folderPath}/${name}.resolver.ts`;
  let resolverContent = `/* eslint-disable eol-last */
import { NotFoundException } from "@nestjs/common";
import { CachingService } from "@multiversx/sdk-nestjs";
import { CacheInfo, generateHash } from "src/utils/cache.info";
import { ${className}Service } from './${name}.service';
import { Args, Query, Resolver, ResolveField, Parent } from "@nestjs/graphql";
import * as gqlModel from "../../graphql/graphql";

@Resolver(() => gqlModel.${className})
export class ${className}Resolver {
}

@Resolver(() => Query)
export class Query${className}Resolver {
  @Query(() => gqlModel.${className})
  ${variableName}(${
    needInputAddress ? "@Args('address') address: string" : ''
  }): gqlModel.${className} {
  const ${variableName} = new gqlModel.${className}();
  ${needInputAddress ? `${variableName}._address = address;` : ''}
  return ${variableName};
  }
}
`;
  utils.writeFile(resolverFilePath, resolverContent);
}
