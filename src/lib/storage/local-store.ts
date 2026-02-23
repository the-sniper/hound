import { mkdir, readFile, writeFile, unlink, readdir, stat } from "fs/promises";
import { join, dirname, relative } from "path";
import type { ArtifactStore } from "./artifact-store";

const BASE_DIR = join(process.cwd(), "data", "artifacts");

export class LocalStore implements ArtifactStore {
  async upload(key: string, data: Buffer): Promise<string> {
    const filepath = join(BASE_DIR, key);
    await mkdir(dirname(filepath), { recursive: true });
    await writeFile(filepath, data);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    return readFile(join(BASE_DIR, key));
  }

  async getUrl(key: string): Promise<string> {
    return `/api/artifacts/${key}`;
  }

  async delete(key: string): Promise<void> {
    await unlink(join(BASE_DIR, key));
  }

  async list(prefix: string): Promise<string[]> {
    const searchDir = join(BASE_DIR, prefix);
    const entries = await this.readdirRecursive(searchDir);
    return entries.map((entry) => relative(BASE_DIR, entry));
  }

  async cleanup(retentionDays: number): Promise<number> {
    const threshold = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const allFiles = await this.readdirRecursive(BASE_DIR);
    let deleted = 0;

    for (const filepath of allFiles) {
      const fileStat = await stat(filepath);
      if (fileStat.mtimeMs < threshold) {
        await unlink(filepath);
        deleted++;
      }
    }

    return deleted;
  }

  private async readdirRecursive(dir: string): Promise<string[]> {
    const results: string[] = [];

    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return results;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await this.readdirRecursive(fullPath)));
      } else {
        results.push(fullPath);
      }
    }

    return results;
  }
}
