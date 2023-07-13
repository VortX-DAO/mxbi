import fs from 'fs';
import * as utils from './../utils';
import { AbiGenerator } from './abiGenerator';
import { generateConfigFile } from './config/config.yamlFile';
import * as endpointGenertor from './endpoints';
import * as cacheWarmerGenerator from './cache';
import * as mxbiConfig from './../config';
import path from 'path';

async function createBackendFolder(pwd: string) {
  await utils.downloadRepository(
    mxbiConfig.TEMPLATE_REPOSITORY,
    mxbiConfig.TEMPLATE_REPOSITORY_BRANCH,
    pwd,
  );
}

async function newBackend(contractPath: string, config: mxbiConfig.MxbiConfig) {
  let allAbis = utils.getAllAbis(contractPath);
  let newAbisFolder = `src/abi`;
  allAbis = utils.copyAbis(allAbis, newAbisFolder);

  let importServiceFile: string[] = [];
  let listServices = '';

  let names: string[] = [];
  for (const item of allAbis) {
    let endpointsFolder = `src`;
    let abi = new AbiGenerator(
      item,
      endpointsFolder,
      config.getNeedInputAddress(),
      config,
    );

    let name = abi.get_name();
    if (abi.isEmpty) {
      continue;
    }

    console.log(`Generate new ${name}`);
    abi.generate_new_backend();
    let className = utils.generateClassName(name);
    names.push(name);

    let serviceName = `import { ${className}Module } from './${name}/${name}.module'; \n`;
    if (!importServiceFile.includes(serviceName)) {
      importServiceFile.push(serviceName);
    }
    listServices += `${className}Module, `;
  }

  // Generate config.yaml
  let configFolders = [
    `config/config.devnet.yaml`,
    'config/config.mainnet.yaml',
    'config/config.testnet.yaml',
  ];
  configFolders.forEach((item) => {
    generateConfigFile(item, names, allAbis, config.getNetwork());
  });

  // Create endpoints.services.module.ts
  endpointGenertor.generateEndpointServicesModule(
    importServiceFile.join(''),
    listServices,
  );
  cacheWarmerGenerator.generateCacheWarmerModule(names);

  //Graphql Custom Scalars
  let graphqltsUrl = `src/graphql/`;
  if (!fs.existsSync(graphqltsUrl)) {
    fs.mkdirSync(graphqltsUrl, {
      recursive: true,
    });
    fs.mkdirSync(graphqltsUrl + '/scalars', {
      recursive: true,
    });
  }
}
async function upgradeBackend(
  contractPath: string,
  config: mxbiConfig.MxbiConfig,
) {
  let allAbis = utils.getAllAbis(contractPath);
  let newAbisFolder = `src/abi`;
  allAbis = utils.copyAbis(allAbis, newAbisFolder);

  let importServiceFile: string[] = [];
  let listServices = '';

  let names: string[] = [];
  for (const item of allAbis) {
    let endpointsFolder = `src`;
    let abi = new AbiGenerator(
      item,
      endpointsFolder,
      config.getNeedInputAddress(),
      config,
    );

    if (abi.isEmpty) {
      continue;
    }

    let name = abi.get_name();
    if (fs.existsSync(`${endpointsFolder}/endpoints/${name}`)) {
      console.log(`Upgrade ${name}`);
      abi.upgrade_backend();
    } else {
      console.log(`Generate new ${name}`);
      abi.generate_new_backend();
    }
    let className = utils.generateClassName(name);
    names.push(name);

    let serviceName = `import { ${className}Module } from './${name}/${name}.module'; \n`;
    if (!importServiceFile.includes(serviceName)) {
      importServiceFile.push(serviceName);
    }
    listServices += `${className}Module, `;
  }

  // Generate config.yaml
  let configFolder = `config/config.yaml`;
  generateConfigFile(configFolder, names, allAbis, config.getNetwork());

  // Create endpoints.services.module.ts
  endpointGenertor.generateEndpointServicesModule(
    importServiceFile.join(''),
    listServices,
  );
  cacheWarmerGenerator.generateCacheWarmerModule(names);
}

export async function generateBackend(
  contractPath: string,
  skipBuild: boolean,
) {
  console.log('Run mxpy build SCs');
  if (!skipBuild) {
    await utils.buildContract(contractPath);
  }

  if (utils.isDirectoryEmpty(utils.getWorkingDirectory())) {
    console.log('Generating New Backend');
    await createBackendFolder(utils.getWorkingDirectory());
    mxbiConfig.createDefaultMxbiConfig();
    let config = new mxbiConfig.MxbiConfig(
      utils.getWorkingDirectory() + '/mxbi_config.yaml',
    );
    newBackend(contractPath, config);
  } else {
    if (
      mxbiConfig.isExistConfig(utils.getWorkingDirectory()) &&
      mxbiConfig.isExistPackageJson(utils.getWorkingDirectory())
    ) {
      console.log('Upgrade backend');
      let pwd = utils.getWorkingDirectory();
      let config = new mxbiConfig.MxbiConfig(pwd + '/mxbi_config.yaml');
      upgradeBackend(contractPath, config);
    } else if (mxbiConfig.isExistConfig(utils.getWorkingDirectory())) {
      console.log('Generate New Backend with existing config');
      let pwd = utils.getWorkingDirectory();
      let config = new mxbiConfig.MxbiConfig(pwd + '/mxbi_config.yaml');
      let parent = path.dirname(pwd) + `/${Date.now()}`;
      await createBackendFolder(parent);
      utils.moveAllFilesAndFolders(parent, pwd);
      utils.removeAll(parent);
      newBackend(contractPath, config);
      config.writeMxbiConfig();
    } else {
      console.error(
        'Folder is non-empty. The existing folder was not generated by mxbi.',
      );
      process.exit(1);
    }
  }
}
