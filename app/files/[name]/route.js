import { getMe } from '../../../lib/me.js'
import { FILE_NAME, getImage, typeOf } from '../../../lib/s3.js'

// Images stay private in the bucket; only signed-in people can load them.
export async function GET(_req, { params }) {
  const { name } = await params
  if (!FILE_NAME.test(name)) return new Response('Not found', { status: 404 })
  if (!(await getMe())) return new Response('Sign in first', { status: 401 })
  try {
    const obj = await getImage(name)
    return new Response(obj.Body.transformToWebStream(), {
      headers: { 'Content-Type': typeOf(name), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=31536000, immutable' },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
