import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' }
export const MAX_IMAGE = 5 * 1024 * 1024
export const FILE_NAME = /^[0-9a-f-]{36}\.(jpg|png|gif|webp)$/
export const typeOf = (name) => Object.keys(IMAGE_TYPES).find((t) => IMAGE_TYPES[t] === name.split('.').pop())

const bucket = () => process.env.S3_BUCKET
const client = (globalThis.__s3 ??= new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '', secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '' },
}))

export const putImage = (name, body, type) => client.send(new PutObjectCommand({ Bucket: bucket(), Key: name, Body: body, ContentType: type }))
export const getImage = (name) => client.send(new GetObjectCommand({ Bucket: bucket(), Key: name }))
