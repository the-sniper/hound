declare module "@aws-sdk/client-s3" {
  export class S3Client {
    constructor(config: Record<string, unknown>);
    send(command: unknown): Promise<unknown>;
  }
  export class PutObjectCommand {
    constructor(input: Record<string, unknown>);
  }
  export class GetObjectCommand {
    constructor(input: Record<string, unknown>);
  }
  export class DeleteObjectCommand {
    constructor(input: Record<string, unknown>);
  }
  export class ListObjectsV2Command {
    constructor(input: Record<string, unknown>);
  }
  export class DeleteObjectsCommand {
    constructor(input: Record<string, unknown>);
  }
}

declare module "pngjs" {
  export class PNG {
    width: number;
    height: number;
    data: Buffer;
    constructor(options?: Record<string, unknown>);
    static sync: {
      read(buffer: Buffer, options?: Record<string, unknown>): PNG;
      write(png: PNG): Buffer;
    };
  }
}
