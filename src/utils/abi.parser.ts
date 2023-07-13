import * as stringUtils from './strings';

export enum TypeMapping {
  Graphql,
  Typescript,
  Postgres,
}

export function abiTypeMapping(
  type: string,
  mappingFor: TypeMapping,
  // isTsFn: boolean,
  isArgs: boolean = false,
): string {
  type = type.trim();
  if (type == '[bytes]') {
    return 'String';
  }

  if (type.includes('List')) {
    const result = abiTypeMapping(
      stringUtils.listStringToArray(type),
      mappingFor,
      isArgs,
    );
    return abiTypeMapping(
      mappingFor == TypeMapping.Graphql ? `[${result}]` : `${result}[]`,
      mappingFor,
      isArgs,
    );
  } else if (type.includes('variadic')) {
    const result = abiTypeMapping(
      stringUtils.variadicStringToArray(type),
      mappingFor,
      isArgs,
    );
    return abiTypeMapping(
      mappingFor == TypeMapping.Graphql ? `[${result}]` : `${result}[]`,
      mappingFor,
      isArgs,
    );
  } else if (type.includes('multi')) {
    const result = stringUtils.multiToObject(type);
    return abiTypeMapping(result, mappingFor);
  } else if (type.includes('tuple')) {
    const result = stringUtils.tupleToObject(type);
    return abiTypeMapping(result, mappingFor);
  } else if (type.includes('Option<') || type.includes('optional<')) {
    return `${abiTypeMapping(
      stringUtils.optionType(type),
      mappingFor,
      isArgs,
    )}`;
  } else {
    switch (mappingFor) {
      case TypeMapping.Typescript:
        switch (type) {
          case 'BigInt':
          case 'BigUIntType':
          case 'BigUint':
          case 'TokenIdentifierType':
          case 'TokenIdentifier':
            return 'string';
          case 'bytes':
          case 'string':
            return 'string';
          case 'bool':
            return 'boolean';
          case 'u128':
          case 'u64':
          case 'u32':
          case 'u8':
            return 'number';
          default:
            if (type == 'Address') {
              if (isArgs) {
                return 'string';
              } else {
                return 'gqlModel.GQLAddress';
              }
            }
            if (type.includes('[')) {
              return type;
            }
            if (isArgs) {
              return `gqlModel.${stringUtils.generateClassName(type)}Input`;
            }
            return `gqlModel.${stringUtils.generateClassName(type)}`;
        }
      case TypeMapping.Graphql:
        switch (type) {
          case 'BigInt':
          case 'BigUIntType':
          case 'BigUint':
          case 'TokenIdentifierType':
          case 'TokenIdentifier':
          case 'string':
            return 'String';
          case 'bool':
            return 'Boolean';
          case 'u128':
          case 'u64':
          case 'u32':
          case 'u8':
            return 'Int';
          default:
            if (type.includes('[')) {
              return type;
            }
            if (type == 'bytes') {
              if (isArgs) {
                return 'String';
              } else {
                return 'BufferCustom';
              }
            }
            if (type == 'Address') {
              if (isArgs) {
                return 'String';
              } else {
                return 'AddressCustom';
              }
            }
            if (isArgs) {
              return `${type}Input`;
            }

            return type;
        }
      case TypeMapping.Postgres:
        switch (type) {
          case 'BigInt':
          case 'BigUIntType':
          case 'BigUint':
          case 'TokenIdentifierType':
          case 'TokenIdentifier':
          case 'Address':
            return 'string';
          case 'bytes':
          case 'string':
            return 'string';
          case 'bool':
            return 'boolean';
          case 'u128':
          case 'u64':
            return 'string';
          case 'u32':
          case 'u8':
            return 'number';
          default:
            if (type.includes('[')) {
              return type;
            }
            if (isArgs) {
              return `gqlModel.${stringUtils.generateClassName(type)}Input`;
            }
            return `gqlModel.${stringUtils.generateClassName(type)}`;
        }
    }
  }
}

function isCustomType(name: String, type: string, json: any): boolean {
  return Object.entries(json.types).filter(
    ([typeName, typeData]: [string, any]) => {
      if (typeName === name.trim().split('.')[1] && typeData.type == type) {
        return true;
      }
      return false;
    },
  ).length > 0
    ? true
    : false;
}

export function parserMapping(
  type: string,
  json: any,
  mappingFor: TypeMapping,
): string {
  if (isCustomType(abiTypeMapping(type, mappingFor), 'enum', json)) {
    return 'firstValue?.valueOf().name';
  } else {
    return 'firstValue?.valueOf()';
  }
}
