export function capitalizeFirstLetter(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function decapitalizeFirstLetter(input: string): string {
  return input.charAt(0).toLowerCase() + input.slice(1);
}

function convertStringToCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (match, letter) => {
    return letter.toUpperCase();
  });
}

function convertDashToCamelCase(str: string): string {
  const words = str.split('-');
  const capitalizedWords = words.map((word) => {
    return convertStringToCamelCase(word);
  });
  return capitalizedWords.join('');
}

function snakeCaseToCamelCase(str: string): string {
  const words = str.split('_');
  const capitalizedWords = words.map((word) => {
    return capitalizeFirstLetter(convertStringToCamelCase(word));
  });
  return capitalizedWords.join('');
}

export function generateClassName(v: string): string {
  return snakeCaseToCamelCase(convertDashToCamelCase(v));
}

export function generateVariableName(v: string): string {
  return decapitalizeFirstLetter(snakeCaseToCamelCase(v));
}

//Complex string utils//
export function optionType(opt: string): string {
  const regex = /Option<(.+)>/i;
  const regex2 = /optional<(.+)>/i;
  const match = opt.match(regex);
  if (match) {
    return match[1];
  }
  const match2 = opt.match(regex2);
  if (match2) {
    return match2[1];
  }
  return '';
}

export function listStringToArray(listStr: string): string {
  const regex = /List<(.+)>/i;
  const match = listStr.match(regex);
  if (match) {
    return match[1];
  }
  return '';
}

export function variadicStringToArray(listStr: string): string {
  const regex = /variadic<(.+)>/i;
  const match = listStr.match(regex);
  if (match) {
    return match[1];
  }
  return '';
}

export function multiToObject(multiStr: string): string {
  const regex = /multi<(.+)>/i;
  const match = multiStr.match(regex);
  if (match) {
    const types = match[1]
      .split(',')
      .map((str) => str.trim().replace(/[<>]/g, ''));
    const capitalizedTypes = types.map((type) => capitalizeFirstLetter(type));
    return `${capitalizedTypes.join('')}TupleObj`;
  }
  return `Can not parse ${multiStr} type`;
}
//
export function tupleToObject(multiStr: string): string {
  const regex = /tuple<(.+)>/i;
  const match = multiStr.match(regex);
  if (match) {
    const types = match[1].split(',').map((str) => str.trim());
    const capitalizedTypes = types.map((type) => capitalizeFirstLetter(type));
    return `${capitalizedTypes.join('')}TupleObj`;
  }
  return `Can not parse ${multiStr} type`;
}
// export function tupleToObject(multiStr: string): string {
//   const regex = /tuple<((?:.+?,\s*)+.?)>/i;
//   const match = multiStr.match(regex);
//   if (match) {
//     const types = match[1].split(",").map((type) => type.trim());
//     return (
//       types
//         .map((type, i) => (i === 0 ? capitalizeFirstLetter(type) : type))
//         .join("") + "TupleObj"
//     );
//   }
//   return `0 Parse dc ${multiStr}`;
// }
