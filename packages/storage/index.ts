import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import config from "@config";
import { createLogger } from "@logger";

const log = createLogger("storage");

const s3 = new S3Client({
  endpoint: config.get("s3.endpoint"),
  region: config.get("s3.region"),
  credentials: {
    accessKeyId: config.get("s3.accessKeyId"),
    secretAccessKey: config.get("s3.secretAccessKey"),
  },
  forcePathStyle: true, // required for LocalStack
});

const defaultBucket = config.get("s3.bucket");

/** Ensure default bucket exists on startup */
try {
  await s3.send(new HeadBucketCommand({ Bucket: defaultBucket }));
} catch {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: defaultBucket }));
    log.info({ bucket: defaultBucket }, "S3 bucket created");
  } catch (err) {
    log.error({ err, bucket: defaultBucket }, "Failed to create S3 bucket");
  }
}

log.info(
  { endpoint: config.get("s3.endpoint"), bucket: defaultBucket },
  "S3 client initialized"
);

export async function upload(
  key: string,
  body: Buffer | Uint8Array | ReadableStream,
  contentType: string,
  bucket = defaultBucket
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  log.debug({ key, bucket }, "Object uploaded");
  return key;
}

export async function download(
  key: string,
  bucket = defaultBucket
): Promise<{ body: ReadableStream; contentType?: string }> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  return {
    body: res.Body!.transformToWebStream(),
    contentType: res.ContentType,
  };
}

export async function remove(
  key: string,
  bucket = defaultBucket
): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key })
  );
  log.debug({ key, bucket }, "Object deleted");
}

export async function list(
  prefix: string,
  bucket = defaultBucket
): Promise<string[]> {
  const res = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
  );
  return (res.Contents ?? []).map((obj) => obj.Key!);
}

export async function getPresignedUrl(
  key: string,
  expiresIn = 3600,
  bucket = defaultBucket
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  );
}

export function getPublicUrl(key: string, bucket = defaultBucket): string {
  return `${config.get("s3.endpoint")}/${bucket}/${key}`;
}

export { s3 as s3Client };
