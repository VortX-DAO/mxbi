import * as utils from '../../utils';

export function generateCacheWarmerService(name: string) {
  let cacheFilePath =
    '../' + name + '/src/crons/cache.warmer/cache.warmer.service.ts';
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
    //       const cacheKey = await this.${name}Service.getAllExamplesRaw();
    //       await this.invalidateKey('${name}', cacheKey, Constants.oneHour());
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
