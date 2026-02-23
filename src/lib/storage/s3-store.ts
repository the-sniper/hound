import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import type { ArtifactStore } from "./artifact-store";

interface S3Object {
  Key?: string;
  LastModified?: Date;
}

interface ListResponse {
  Contents?: S3Object[];
  IsTruncated?: boolean;
  NextContinuationToken?: string;
}

interface GetResponse {
  Body?: AsyncIterable<Uint8Array>;
}

export class S3Store implements ArtifactStore {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || "hound-artifacts";
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "",
        secretAccessKey: process.env.S3_SECRET_KEY || "",
      },
      forcePathStyle: true,
    });
  }

  async upload(key: string, data: Buffer, contentType?: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      })
    );
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const response = (await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    )) as GetResponse;

    const stream = response.Body;
    if (!stream) throw new Error(`Empty response for key: ${key}`);

    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async getUrl(key: string): Promise<string> {
    return `/api/artifacts/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = (await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      )) as ListResponse;

      for (const obj of response.Contents || []) {
        if (obj.Key) keys.push(obj.Key);
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return keys;
  }

  async cleanup(retentionDays: number): Promise<number> {
    const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const allKeys = await this.listWithMetadata(threshold);

    if (allKeys.length === 0) return 0;

    const batches: string[][] = [];
    for (let i = 0; i < allKeys.length; i += 1000) {
      batches.push(allKeys.slice(i, i + 1000));
    }

    let deleted = 0;
    for (const batch of batches) {
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: batch.map((key) => ({ Key: key })),
          },
        })
      );
      deleted += batch.length;
    }

    return deleted;
  }

  private async listWithMetadata(olderThan: Date): Promise<string[]> {
    const expiredKeys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = (await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          ContinuationToken: continuationToken,
        })
      )) as ListResponse;

      for (const obj of response.Contents || []) {
        if (obj.Key && obj.LastModified && obj.LastModified < olderThan) {
          expiredKeys.push(obj.Key);
        }
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return expiredKeys;
  }
}
