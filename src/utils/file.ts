import fs from 'fs';
import path from 'path';
import prettier from 'prettier';

export function copyFolderRecursive(src: string, dest: string) {
  const isDirectory = fs.statSync(src).isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, {
        recursive: true,
      });
    }

    fs.readdirSync(src).forEach((file: any) => {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      copyFolderRecursive(srcPath, destPath);
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

export function writeFile(path: string, content: string, isTs: boolean = true) {
  if (isTs) {
    content = prettier.format(content, {
      parser: 'typescript',
    });
  }
  fs.writeFileSync(path, content);
}

export function removeAll(directory: string) {
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch (err) {
    console.error(`Error during remove operation: ${err}`);
  }
}

export function moveAllFilesAndFolders(srcDir: string, destDir: string) {
  try {
    const files = fs.readdirSync(srcDir);

    for (const file of files) {
      if (file === 'mxbi_config.yaml') {
        continue; // Skip the 'mxbi_config.yaml' file
      }

      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);

      fs.renameSync(srcPath, destPath);
    }
  } catch (err) {
    console.error(`Error during move operation: ${err}`);
  }
}

export function writeGraphqlFile(path: string, content: string) {
  content = prettier.format(content, {
    parser: 'graphql',
  });
  fs.writeFileSync(path, content);
}

export function isDirectoryEmpty(path: string) {
  try {
    return fs.readdirSync(path).length === 0;
  } catch (err) {
    console.error(`Unable to scan directory: ${err}`);
    throw err;
  }
}

export function getWorkingDirectory(): string {
  return process.cwd();
}
