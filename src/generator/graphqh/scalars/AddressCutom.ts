import * as utils from '../../../utils';
export function generateAddressCustom(path: string) {
  let resolverFilePath = `${path}/AddressCustom.ts`;
  let resolverContent = `/* eslint-disable eol-last */
import { Address } from '@multiversx/sdk-core/out';
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind } from 'graphql';
import * as gqlModel from '../graphql';

@Scalar('AddressCustom', (type) => Address)
export class AddressCustomScalar implements CustomScalar<string, Address> {
  description = 'Address custom type';

  parseValue(value: unknown): Address {
    return Address.fromString(value as string); // value from the client
  }

  serialize(value: any): string {
    // return value.bech32();
    if (typeof value.bech32 !== 'function') {
      return value.bech32;
    } else {
      return value.bech32();
    }
  }

  parseLiteral(ast: any) {
    // AST parsing logic here. This function is used when you get the scalar value from the client in a query or mutation
    if (ast.kind === Kind.STRING) {
      return ast.value.toString(); // Return a string from the AST value
    }
    return null; // Invalid hard-coded value, return null
  }
}
`;
  utils.writeFile(resolverFilePath, resolverContent);
}
