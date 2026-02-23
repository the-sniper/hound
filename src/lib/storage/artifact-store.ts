export interface ArtifactStore {
  upload(key: string, data: Buffer, contentType?: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  getUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  cleanup(retentionDays: number): Promise<number>;
}
