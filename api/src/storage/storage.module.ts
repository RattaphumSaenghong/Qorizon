import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE } from './storage.service';
import { LocalStorageService } from './local-storage.service';
import { R2StorageService } from './r2-storage.service';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const hasR2 =
          config.get('R2_ACCOUNT_ID') &&
          config.get('R2_BUCKET') &&
          config.get('R2_ACCESS_KEY_ID') &&
          config.get('R2_SECRET_ACCESS_KEY') &&
          config.get('R2_PUBLIC_BASE');
        return hasR2 ? new R2StorageService(config) : new LocalStorageService(config);
      },
    },
  ],
  exports: [STORAGE],
})
export class StorageModule {}
