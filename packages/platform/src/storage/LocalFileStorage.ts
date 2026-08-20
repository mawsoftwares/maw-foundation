import type {
  IFileStorage,
  StoredFile,
  UploadRequest,
  FileListOptions,
  FileListResult,
} from '@maw/sdk/contracts/IFileStorage';
import { getMimeType } from '@maw/sdk/kernel/file';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface LocalFileStorageOptions {
  readonly rootDir: string;
  readonly publicUrlPrefix: string;
}

export class LocalFileStorage implements IFileStorage {
  private readonly rootDir: string;
  private readonly publicUrlPrefix: string;

  constructor(options: LocalFileStorageOptions) {
    this.rootDir = options.rootDir;
    this.publicUrlPrefix = options.publicUrlPrefix.replace(/\/$/, '');
    fs.mkdirSync(this.rootDir, { recursive: true });
  }

  async put(key: string, data: Buffer | ReadableStream | Uint8Array, opts: UploadRequest): Promise<StoredFile> {
    const filePath = this.resolve(key);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    if (data instanceof Buffer || data instanceof Uint8Array) {
      fs.writeFileSync(filePath, data);
    } else {
      const reader = (data as ReadableStream<Uint8Array>).getReader();
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      fs.writeFileSync(filePath, Buffer.concat(chunks));
    }

    const stat = fs.statSync(filePath);
    return {
      key,
      url: `${this.publicUrlPrefix}/${key}`,
      size: stat.size,
      mimeType: opts.mimeType || getMimeType(opts.originalName),
      originalName: opts.originalName,
      createdAt: stat.birthtime.toISOString(),
      metadata: opts.metadata,
    };
  }

  async getUrl(key: string): Promise<string> {
    return `${this.publicUrlPrefix}/${key}`;
  }

  async head(key: string): Promise<StoredFile | null> {
    const filePath = this.resolve(key);
    if (!fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).slice(1);
    return {
      key,
      url: `${this.publicUrlPrefix}/${key}`,
      size: stat.size,
      mimeType: getMimeType(`file.${ext}`),
      originalName: path.basename(filePath),
      createdAt: stat.birthtime.toISOString(),
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolve(key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  async list(options?: FileListOptions): Promise<FileListResult> {
    const prefix = options?.prefix ?? '';
    const maxKeys = options?.maxKeys ?? 1000;
    const searchDir = this.resolve(prefix);

    if (!fs.existsSync(searchDir)) {
      return { files: [], hasMore: false };
    }

    const files: StoredFile[] = [];
    this.walkDir(searchDir, prefix, files, maxKeys);

    return {
      files: files.slice(0, maxKeys),
      hasMore: files.length > maxKeys,
    };
  }

  private walkDir(dir: string, prefix: string, results: StoredFile[], limit: number): void {
    if (results.length >= limit) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= limit) break;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.walkDir(fullPath, prefix, results, limit);
      } else {
        const key = path.relative(this.rootDir, fullPath).replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);
        results.push({
          key,
          url: `${this.publicUrlPrefix}/${key}`,
          size: stat.size,
          mimeType: getMimeType(entry.name),
          originalName: entry.name,
          createdAt: stat.birthtime.toISOString(),
        });
      }
    }
  }

  private resolve(key: string): string {
    const resolved = path.resolve(this.rootDir, key);
    if (!resolved.startsWith(path.resolve(this.rootDir))) {
      throw new Error('Path traversal detected');
    }
    return resolved;
  }
}
