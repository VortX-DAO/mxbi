import fs from 'fs';
import path from 'path';

export function getAllAbis(path: string): string[] {
  const abis = listFilesWithAbiJson(path);
  return abis;
}

export function copyAbis(abiPaths: string[], newAbisFolder: string): string[] {
  if (!fs.existsSync(newAbisFolder)) {
    fs.mkdirSync(newAbisFolder);
  }

  let newAbiPaths: string[] = [];
  abiPaths.forEach(abiPath => {
    let abiName = path.basename(abiPath);
    let newPath = path.join(newAbisFolder, abiName);
    fs.copyFileSync(abiPath, newPath);
    newAbiPaths.push(newPath);
  })

  return newAbiPaths;
}

// Util functions
function listFilesWithAbiJson(folderPath: string): string[] {
  let abiJsonFiles: string[] = [];
  const files = fs.readdirSync(folderPath);
  files.forEach((file) => {
    const filePath = path.join(folderPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      abiJsonFiles = abiJsonFiles.concat(listFilesWithAbiJson(filePath));
    } else if (file.endsWith('.abi.json')) {
      abiJsonFiles.push(filePath);
    }
  });
  return abiJsonFiles;
}
export function copyFolderRecursive(src: string, dest: string) {
  // Check if the source path is a directory or a file
  const isDirectory = fs.statSync(src).isDirectory();

  if (isDirectory) {
    // Create the destination directory if it doesn't exist
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }

    // Copy each file and subfolder in the directory
    fs.readdirSync(src).forEach((file: any) => {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      copyFolderRecursive(srcPath, destPath);
    });
  } else {
    // Copy the file to the destination folder
    fs.copyFileSync(src, dest);
  }
}

export function writeFile(path: string, content: string) {
  fs.writeFileSync(path, content);
}

function convertStringToCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (match, letter) => {
    return letter.toUpperCase();
  });
}
export function convertDashToCamelCase(str: string): string {
  const words = str.split('-');
  const capitalizedWords = words.map((word) => {
    return convertStringToCamelCase(word);
  });
  return capitalizedWords.join('');
}

export function removeUnderScore(str: string): string {
  const words = str.split('_');
  const capitalizedWords = words.map((word) => {
    return convertStringToCamelCase(word);
  });
  return capitalizedWords.join('');
}

export function snakeCaseToCamelCase(str: string): string {
  const words = str.split('_');
  const capitalizedWords = words.map((word) => {
    return capitalizeFirstLetter(convertStringToCamelCase(word));
  });
  return capitalizedWords.join('');
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
  const regex = /multi<(.+),\s*(.+)>/i;
  const match = multiStr.match(regex);
  if (match) {
    const typeA = match[1];
    const typeB = match[2];
    return `${typeA}${typeB}TupleObj`;
  }
  return '';
}

export function tupleToObject(multiStr: string): string {
  const regex = /tuple<(.+),\s*(.+)>/i;
  const match = multiStr.match(regex);
  if (match) {
    const typeA = match[1];
    const typeB = match[2];
    return `${typeA}${typeB}TupleObj`;
  }
  return '';
}

export function typeMappingForOutput(
  type: string,
  isArgs: boolean = false,
): string {
  if (type == '[bytes]') {
    return 'String';
  }

  if (type.includes('List')) {
    const result = `[${typeMappingForOutput(listStringToArray(type), isArgs)}]`;
    return typeMappingForOutput(result, isArgs);
  } else if (type.includes('variadic')) {
    const result = `[${typeMappingForOutput(
      variadicStringToArray(type),
      isArgs,
    )}]`;
    return typeMappingForOutput(result, isArgs);
  } else if (type.includes('multi')) {
    const result = multiToObject(type);
    return typeMappingForOutput(result);
  } else if (type.includes('tuple')) {
    const result = tupleToObject(type);
    return typeMappingForOutput(result);
  } else {
    switch (type) {
      case 'BigInt':
      case 'BigUIntType':
      case 'BigUint':
      case 'TokenIdentifierType':
      case 'TokenIdentifier':
      case 'LockedBalance':
      case 'bytes':
      case 'string':
      case 'Address':
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
        if (isArgs) {
          return `${type}Input`;
        }

        return type;
    }
  }
}

function capitalizeFirstLetter(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}
