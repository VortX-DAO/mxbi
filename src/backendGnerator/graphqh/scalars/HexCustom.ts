import * as utils from '../../../utils';
export function generateBufferCustom(path: string) {
  let resolverFilePath = `${path}/HexCustom.ts`;
  let resolverContent = `/* eslint-disable eol-last */
import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind } from 'graphql';

@Scalar('Hex', (type) => Buffer)
export class HexCustomScalar implements CustomScalar<string, Buffer> {
  description = 'Hex custom type';

  parseValue(value: unknown): Buffer {
    return Buffer.from(value as string, 'hex'); // value from the client
  }

  serialize(value: any): string {
    const buffer = Buffer.from(value);
    return buffer.toString('hex');
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
