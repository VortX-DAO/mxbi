import * as utils from './../utils';
import { AbiGenerator } from './abiGenerator';
import * as mxbiConfig from './../config';
import { generateConfigFile } from '../backendGnerator/config/config.yamlFile';

async function createTemplateFolder(pwd: string) {
  await utils.downloadRepository(
    mxbiConfig.TEMPLATE_CRAWLER_REPOSITORY,
    mxbiConfig.TEMPLATE_CRAWLER_REPOSITORY_BRANCH,
    pwd,
  );
}

async function newCrawler(contractPath: string, config: mxbiConfig.MxbiConfig) {
  let allAbis = utils.getAllAbis(contractPath);

  let needToRemove: string[] = [];
  let abiNames: string[] = [];
  let allEvents: string[] = [];
  for (const item of allAbis) {
    let endpointsFolder = `src`;
    let abi = new AbiGenerator(
      item,
      endpointsFolder,
      config.getNeedInputAddress(),
      config,
    );
    if (abi.isEmptyEvent()) {
      console.log(`${abi.getName()} is Empty`);
      needToRemove.push(item);
      continue;
    }
    abi.generate_new_backend();
    abiNames.push(abi.getName());
    allEvents = [...allEvents, ...abi.getEventTypes()];
  }

  allAbis = allAbis.filter((item) => !needToRemove.includes(item));
  let newAbisFolder = `src/abi`;
  allAbis = utils.copyAbis(allAbis, newAbisFolder);

  writeCrawlerModule(`src/crawler`, abiNames);
  writeRootConfig(`src`, allEvents);
  writeRootIndex(`src`, abiNames);
  // Generate config.yaml
  let configFolders = [
    `config/config.devnet.yaml`,
    'config/config.mainnet.yaml',
    'config/config.testnet.yaml',
  ];
  configFolders.forEach((item) => {
    generateConfigFile(item, abiNames, allAbis, config.getNetwork());
  });
}

export async function generateCrawler(
  contractPath: string,
  skipBuild: boolean,
) {
  console.log('Run mxpy build SCs');
  if (!skipBuild) {
    await utils.buildContract(contractPath);
  }

  console.log('Generating New CrawlerService');
  await createTemplateFolder(utils.getWorkingDirectory());
  mxbiConfig.createDefaultMxbiConfig();
  let config = new mxbiConfig.MxbiConfig(
    utils.getWorkingDirectory() + '/mxbi_config.yaml',
  );
  newCrawler(contractPath, config);
}

function writeCrawlerModule(path: string, abiNames: string[]) {
  path = `${path}/crawler.module.ts`;

  const content = `
${abiNames
  .map((v) => {
    return `
export * from "./${v}/${v}.service";
export * from "./${v}/${v}.entity";
`;
  })
  .join('\n')}
  export * from "./entity";
  `;
  utils.writeFile(path, content);
}

function writeRootConfig(path: string, allEvents: string[]) {
  path = `${path}/config.ts`;
  allEvents.push('CrawledTransactions');

  let content = `
// Config that is common to more than one part of the app.

import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import * as CrawlerModule from "./crawler/crawler.module";
import { Config } from "./common/config";

let config = new Config("./config/config.yaml");
const typeOrmConfig: PostgresConnectionOptions = {
    type: "postgres",
    host: config.getDbConfig("host"),
    port: config.getDbConfig("port") as number,
    username: config.getDbConfig("username"),
    password: config.getDbConfig("password"),
    database: config.getDbConfig("name"),
    synchronize: true,
    logging: false,
    entities: [
  ${allEvents.map((v) => `CrawlerModule.${v}`).join(',')}
    ],
};

export { typeOrmConfig };
  `;
  utils.writeFile(path, content);
}

function writeRootIndex(path: string, abiNames: string[]) {
  path = `${path}/index.ts`;

  let content = `
// Must be at top
import "reflect-metadata";

import { createConnection } from "typeorm";
import { typeOrmConfig } from "./config";
import * as CrawlerModule from "./crawler/crawler.module";
import { readConfig } from "./../config/configuration";
import { Config } from "./common/config";

(async () => {
    // App's main content. For example, this could be an Express or console app.
    const conn = await createConnection(typeOrmConfig);
    console.log("PG connected. App is ready to do work.");
    readConfig();

    let config = new Config("./config/config.yaml");
    //  

${abiNames
  .map((v) => {
    const className = utils.generateClassName(v);
    return `let ${utils.generateVariableName(
      v,
    )}Service = new CrawlerModule.${className}CrawlerService(
        config,
        conn
    );`;
  })
  .join('\n')}

await Promise.all([
${abiNames.map((v) => `${utils.generateVariableName(v)}Service.run()`).join()}
]);
    await conn.close();
    console.log("PG connection closed.");
})();
  `;
  utils.writeFile(path, content);
}
