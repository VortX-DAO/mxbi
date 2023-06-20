import fs from 'fs';
import path from 'path';

export function getAllAbis(path: string): string[] {
  const abis = listFilesWithAbiJson(path);
  return abis;
}

export function copyAbis(abiPaths: string[], newAbisFolder: string): string[] {
  if (!fs.existsSync(newAbisFolder)) {
    fs.mkdirSync(newAbisFolder, {
      recursive: true,
    });
  }

  let newAbiPaths: string[] = [];
  abiPaths.forEach((abiPath) => {
    let abiName = path.basename(abiPath);
    let newPath = path.join(newAbisFolder, abiName);
    fs.copyFileSync(abiPath, newPath);
    newAbiPaths.push(newPath);
  });

  return newAbiPaths;
}

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
