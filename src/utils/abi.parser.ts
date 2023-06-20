import * as stringUtils from './strings';

export function abiTypeMapping(
  type: string,
  isTsFn: boolean,
  isArgs: boolean = false,
): string {
  type = type.trim();
  if (type == '[bytes]') {
    return 'String';
  }

  if (type.includes('List')) {
    const result = `[${abiTypeMapping(
      stringUtils.listStringToArray(type),
      isTsFn,
      isArgs,
    )}]`;
    return abiTypeMapping(result, isTsFn, isArgs);
  } else if (type.includes('variadic')) {
    const result = `[${abiTypeMapping(
      stringUtils.variadicStringToArray(type),
      isTsFn,
      isArgs,
    )}]`;
    return abiTypeMapping(result, isTsFn, isArgs);
  } else if (type.includes('multi')) {
    const result = stringUtils.multiToObject(type);
    return abiTypeMapping(result, isTsFn);
  } else if (type.includes('tuple')) {
    const result = stringUtils.tupleToObject(type);
    return abiTypeMapping(result, isTsFn);
  } else {
    if (isTsFn) {
      switch (type) {
        case 'BigInt':
        case 'BigUIntType':
        case 'BigUint':
        case 'TokenIdentifierType':
        case 'TokenIdentifier':
          return 'string';

        // case 'Address':
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
    } else {
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
  isTsFn: boolean,
): string {
  if (isCustomType(abiTypeMapping(type, isTsFn), 'enum', json)) {
    return 'firstValue?.valueOf().name';
  } else {
    return 'firstValue?.valueOf()';
  }
}
