import * as utils from '../../utils';

export function graphqlTemplate(folderPath: string, name: string) {
  const graphqlContent = '';
  let graphqlFile = `${folderPath}/${name}.graphql`;
  utils.writeFile(graphqlFile, graphqlContent, false);
}

export function generateContractModel(
  json: any,
  folderPath: string,
  name: string,
  needInputAddress: boolean,
) {
  let tupleTypes: string[] = [];
  const queries = json.endpoints
    .filter((endpoint: any) => endpoint.mutability === 'readonly')
    .map((endpoint: any) => {
      let args: string[] = [];
      args = args.concat(
        endpoint.inputs.map((input: any) => {
          let tupleObj = generateTupleType(input.type);
          if (tupleObj != undefined) {
            tupleTypes.push(tupleObj);
          }

          return `${input.name}: ${utils.abiTypeMapping(
            input.type,
            utils.TypeMapping.Graphql,
            true,
          )}`;
        }),
      );
      let tupleObj = generateTupleType(endpoint.outputs[0]?.type);
      if (tupleObj != undefined) {
        tupleTypes.push(tupleObj);
      }
      if (args.length > 0) {
        return `${endpoint.name}(${args.join(',')}): ${
          utils.abiTypeMapping(
            endpoint.outputs[0]?.type,
            utils.TypeMapping.Graphql,
            false,
          ) || 'Boolean'
        } `;
      }
      return `${endpoint.name}: ${
        utils.abiTypeMapping(
          endpoint.outputs[0]?.type,
          utils.TypeMapping.Graphql,
          false,
        ) || 'Boolean'
      } `;
    })
    .join('\n  ');

  const types = Object.entries(json.types)
    .map(([typeName, typeData]: [string, any]) => {
      if (typeData.type === 'struct') {
        const fields = typeData.fields
          .map(
            (field: any) =>
              `${field.name}: ${utils.abiTypeMapping(
                field.type,
                utils.TypeMapping.Graphql,
              )} `,
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
              `${field.name}: ${utils.abiTypeMapping(
                field.type,
                utils.TypeMapping.Graphql,
                true,
              )} `,
          )
          .join('\n  ');
        return `input ${typeName}Input { \n  ${fields} \n } `;
      } else if (typeData.type === 'enum') {
        const variants = typeData.variants
          .map((variant: any) => variant.name)
          .join('\n  ');
        return `enum ${typeName}Input { \n  ${variants} \n } `;
      } else {
        return `scalar ${typeName} `;
      }
    })
    .join('\n\n');
  const uniqueArray = tupleTypes.filter(
    (value, index) => tupleTypes.indexOf(value) === index,
  );
  const joinedString = uniqueArray.join(', ');
  // Create *.module.ts file
  let graphqlFile = `${folderPath}/generatedModel.graphql`;
  let className = utils.generateClassName(name);
  let variableName = utils.generateVariableName(name);
  let graphqlContent = `scalar AddressCustom
scalar BufferCustom

type ${className} {
  ${needInputAddress == true ? 'address: String\n' : ''}${queries}
}

type Query {
  ${variableName}${
    needInputAddress == true ? '(address: String)' : ''
  }: ${className}
}

${joinedString}

${inputTypes}

${types}`;

  utils.writeGraphqlFile(graphqlFile, graphqlContent);
}

function generateTupleType(str: string): string | undefined {
  const check = extractTupleType(str);
  if (check != undefined) {
    let type0 = utils.abiTypeMapping(check[0], utils.TypeMapping.Graphql);
    let type1 = utils.abiTypeMapping(check[1], utils.TypeMapping.Graphql);
    return `type ${utils.generateClassName(check[0])}${check[1]}TupleObj {
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
