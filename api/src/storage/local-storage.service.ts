import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { StorageService } from './storage.service';

/**
 * Dev provider: writes under MEDIA_LOCAL_DIR and serves via the static
 * /uploads route (configured in main.ts). No cloud account needed.
 */
@Injectable()
export class LocalStorageService implements StorageService {
  private readonly baseDir: string;
  private readonly publicBase: string;

  constructor(config: ConfigService) {
    this.baseDir = path.resolve(config.get<string>('MEDIA_LOCAL_DIR') ?? 'uploads');
    this.publicBase = (config.get<string>('MEDIA_PUBLIC_BASE') ?? 'http://localhost:3000').replace(/\/$/, '');
  }

  async put(key: string, body: Buffer): Promise<void> {
    const full = path.join(this.baseDir, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    await fs.rm(path.join(this.baseDir, key), { force: true });
  }
}
