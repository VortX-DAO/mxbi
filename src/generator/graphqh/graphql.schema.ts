import * as utils from '../../utils';
export function generateContractModel(
  json: any,
  folderPath: string,
  name: string,
) {
  let tupleTypes: string[] = [];
  const queries = json.endpoints
    .filter((endpoint: any) => endpoint.mutability === 'readonly')
    .map((endpoint: any) => {
      const args = endpoint.inputs
        .map((input: any) => {
          let tupleObj = generateTupleType(input.type);
          if (tupleObj != undefined) {
            tupleTypes.push(tupleObj);
          }

          return `${input.name}: ${utils.typeMappingForOutput(
            input.type,
            true,
          )}`;
        })
        .join(', ');
      let tupleObj = generateTupleType(endpoint.outputs[0]?.type);
      if (tupleObj != undefined) {
        tupleTypes.push(tupleObj);
      }
      if (args.length > 0) {
        return `${endpoint.name}(${args}): ${utils.typeMappingForOutput(endpoint.outputs[0]?.type) || 'Boolean'
          } `;
      }
      return `${endpoint.name}: ${utils.typeMappingForOutput(endpoint.outputs[0]?.type) || 'Boolean'
        } `;
    })
    .join('\n  ');

  const types = Object.entries(json.types)
    .map(([typeName, typeData]: [string, any]) => {
      if (typeData.type === 'struct') {
        const fields = typeData.fields
          .map(
            (field: any) =>
              `${field.name}: ${utils.typeMappingForOutput(field.type)} `,
          )
          .join('\n  ');
        return `type ${typeName} { \n  ${fields} \n } `;
      } else if (typeData.type === 'enum') {
        const variants = typeData.variants
          .map((variant: any) => variant.name)
          .join('\n  ');
        return `enum ${typeName} { \n  ${variants} \n } `;
      } else {
        return `scalar ${typeName} `;
      }
    })
    .join('\n\n');

  const inputTypes = Object.entries(json.types)
    .map(([typeName, typeData]: [string, any]) => {
      if (typeData.type === 'struct') {
        const fields = typeData.fields
          .map(
            (field: any) =>
              `${field.name}: ${utils.typeMappingForOutput(field.type, true)} `,
          )
          .join('\n  ');
        return `input ${typeName}Input { \n  ${fields} \n } `;
      } else if (typeData.type === 'enum') {
        const variants = typeData.variants
          .map((variant: any) => variant.name)
          .join('\n  ');
        return `enum ${typeName} { \n  ${variants} \n } `;
      } else {
        return `scalar ${typeName} `;
      }
    })
    .join('\n\n');
  const uniqueArray = tupleTypes.filter(
    (value, index) => tupleTypes.indexOf(value) === index,
  );
  const joinedString = uniqueArray.join(', ');
  console.log('Generate *.graphql File');
  console.log(folderPath, name);
  // Create *.module.ts file
  let graphqlFile = `${folderPath}/${name}.graphql`;
  let graphqlContent = `type ${utils.snakeCaseToCamelCase(name)} {
  ${queries}
}

type Query {
  ${utils.removeUnderScore(name)}: ${utils.snakeCaseToCamelCase(name)}
}

type Address {
  bech32: String
}

input AddressInput {
  bech32: String
}

${joinedString}

${inputTypes}

${types}`;

  utils.writeFile(graphqlFile, graphqlContent);
}

function generateTupleType(str: string): string | undefined {
  const check = extractTupleType(str);
  if (check != undefined) {
    let type0 = utils.typeMappingForOutput(check[0]);
    let type1 = utils.typeMappingForOutput(check[1]);
    return `type ${check[0]}${check[1]}TupleObj {
  first: ${type0}
  second: ${type1}
}\n\n`;
  }
  return undefined;
}

function extractTupleType(str: string): [string, string] | undefined {
  const tupleRegex = /(?:tuple|variadic<multi>|multi)<(\w+),(\w+)>/;
  const match = str.match(tupleRegex);
  if (match) {
    return [match[1], match[2]];
  }
  return undefined;
}
