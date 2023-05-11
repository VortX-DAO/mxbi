import fs, { utimes } from 'fs';
import * as utils from '../utils';
import { AbiGenerator } from './abiGenerator';
import { generateConfigFile } from './config/config.yamlFile';
import { downloadRepository } from './../utils.git';

async function createBackendFolder(projName: string) {
  // Create the destination folder if it doesn't exist
  let dest = '../' + projName;
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true });
    console.log(`${dest} is deleted!`);
    // } else {
    //   fs.mkdirSync(dest);
  }
  await downloadRepository(
    'https://github.com/VortX-DAO/mx-template-service',
    'develop',
    dest,
  );
}
export async function generateBackend(projName: string, contractPath: string) {
  console.log('Generate Backend Called');
  // Create new nestjs project based on template project
  projName = projName.charAt(0).toUpperCase() + projName.slice(1) + 'FromMxbi';
  await createBackendFolder(projName);
  let allAbis = utils.getAllAbis(contractPath);
  let newAbisFolder = `../${projName}/src/abi`;
  allAbis = utils.copyAbis(allAbis, newAbisFolder);

  // Controller.module file
  let importControllerFile = '';
  let listControllers = '';

  let importServiceFile: string[] = [];
  let listServices = '';

  let importCacheFile = '';
  let argumentsForConstructor = '';

  let names: string[] = [];
  for (const item of allAbis) {
    let endpointsFolder = `../${projName}/src/endpoints`;
    let abi = new AbiGenerator(item, endpointsFolder);
    let name = abi.generate();
    let className = utils.snakeCaseToCamelCase(name);
    names.push(name);

    // controller.module file
    // importControllerFile += `import { ${name}Controller } from './${name}/${name}.controller'; \n`;
    let serviceName = `import { ${className}Module } from './${name}/${name}.module'; \n`;
    if (!importServiceFile.includes(serviceName)) {
      importServiceFile.push(serviceName);
    }

    importCacheFile += `import { ${className}Service} from './${name}/${name}.service'; \n`;
    // listControllers += `${name}Controller, `;
    listServices += `${className}Module, `;

    argumentsForConstructor += `private readonly ${className}Service: ${className}Service, `;
  }

  // Generate config.yaml
  let configFolder = `../${projName}/config/config.yaml`;
  generateConfigFile(configFolder, names, allAbis);

  // Create endpoints.controllers.module.ts
  // let endpointsControllerFilePath =
  //   '../' + projName + '/src/endpoints/endpoints.controllers.module.ts';
  // let endpointsControllerContent = `/* eslint-disable eol-last */
  // import { Module } from '@nestjs/common';
  // import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
  // import { EndpointsServicesModule } from './endpoints.services.module';
  // ${importControllerFile}
  //
  // @Module({
  //   imports: [EndpointsServicesModule],
  //   providers: [DynamicModuleUtils.getNestJsApiConfigService()],
  //   controllers: [${listControllers}],
  // })
  // export class EndpointsControllersModule {}
  //   `;
  // utils.writeFile(endpointsControllerFilePath, endpointsControllerContent);

  // Create endpoints.services.module.ts
  let endpointsServicesFilePath =
    '../' + projName + '/src/endpoints/endpoints.services.module.ts';
  let endpointsServicesContent = `/* eslint-disable eol-last */
  import { Module } from '@nestjs/common';
  ${importServiceFile.join('')}

  @Module({
    imports: [${listServices}],
    exports: [${listServices}],
  })
  export class EndpointsServicesModule {}
    `;
  utils.writeFile(endpointsServicesFilePath, endpointsServicesContent);

  let cacheFilePath =
    '../' + projName + '/src/crons/cache.warmer/cache.warmer.service.ts';
  let cacheContent = `/* eslint-disable eol-last */
  import { Inject, Injectable } from '@nestjs/common';
  // import { Cron } from '@nestjs/schedule';
  import { ClientProxy } from '@nestjs/microservices';
  import { CachingService, /*Locker,*/ Constants } from '@multiversx/sdk-nestjs';

  @Injectable()
  export class CacheWarmerService {
    constructor(
      private readonly cachingService: CachingService,
      @Inject('PUBSUB_SERVICE') private clientProxy: ClientProxy,
    ) {}

    // @Cron('* * * * *')
    // async handleExampleInvalidations() {
    //   await Locker.lock(
    //     'Example invalidations',
    //     async () => {
    //       const cacheKey = await this.${projName}Service.getAllExamplesRaw();
    //       await this.invalidateKey('${projName}', cacheKey, Constants.oneHour());
    //     },
    //     true,
    //   );
    // }

    private async invalidateKey<T>(key: string, data: T, ttl: number) {
      await Promise.all([
        this.cachingService.setCache(key, data, ttl),
        this.deleteCacheKey(key),
      ]);
    }

    private async deleteCacheKey(key: string) {
      await this.clientProxy.emit('deleteCacheKeys', [key]);
    }
  }`;
  utils.writeFile(cacheFilePath, cacheContent);
}
