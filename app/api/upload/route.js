import { randomUUID } from 'node:crypto'
import { getMe } from '../../../lib/me.js'
import { IMAGE_TYPES, MAX_IMAGE, putImage } from '../../../lib/s3.js'

export async function POST(request) {
  if (!(await getMe())) return Response.json({ error: 'Sign in first' }, { status: 401 })
  if (!process.env.S3_BUCKET) return Response.json({ error: 'Image storage is not set up' }, { status: 503 })
  const file = (await request.formData().catch(() => null))?.get('file')
  const ext = IMAGE_TYPES[file?.type]
  if (!ext) return Response.json({ error: 'Use a JPG, PNG, GIF or WebP image' }, { status: 400 })
  if (file.size > MAX_IMAGE) return Response.json({ error: 'Image is over 5 MB' }, { status: 413 })
  const name = `${randomUUID()}.${ext}`
  try {
    await putImage(name, Buffer.from(await file.arrayBuffer()), file.type)
  } catch (err) {
    console.error('[trackme] image upload failed:', err.message)
    return Response.json({ error: 'Upload failed. Try again.' }, { status: 502 })
  }
  return Response.json({ url: `/files/${name}` })
}
