import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '../../../lib/db.js'
import { signId } from '../../../lib/me.js'

const YEAR = 60 * 60 * 24 * 365
const fail = (why) => redirect(`/?error=${encodeURIComponent(why)}`)

// Step 2: Google sends the browser back here with a one-time code.
export async function GET(request) {
  const url = new URL(request.url)
  const jar = await cookies()
  const state = jar.get('oauth_state')?.value
  jar.delete({ name: 'oauth_state', path: '/auth' })
  if (!state || url.searchParams.get('state') !== state || !url.searchParams.get('code')) fail('Sign-in expired. Try again.')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code: url.searchParams.get('code'),
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.APP_URL}/auth/callback`,
      grant_type: 'authorization_code',
    }),
  })
  const { id_token } = await res.json()
  if (!res.ok || !id_token) fail('Google sign-in failed.')

  // The token came straight from Google over TLS, so reading its payload is enough (no signature check needed).
  const user = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64url').toString())
  const domain = process.env.GOOGLE_ALLOWED_DOMAIN
  if (user.aud !== process.env.GOOGLE_CLIENT_ID || !user.email_verified) fail('Google sign-in failed.')
  if (domain && user.hd !== domain) fail(`Only @${domain} accounts can sign in.`)

  const email = user.email.toLowerCase()
  const person = await prisma.person.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, orderBy: { active: 'desc' } })
  if (person && !person.active) fail('Your account is switched off. Ask an admin.')
  const me = person ?? (await prisma.person.create({ data: { name: user.name || email.split('@')[0], role: 'Dev', email } }))

  jar.set('me', signId(me.id), { httpOnly: true, sameSite: 'lax', secure: url.protocol === 'https:', maxAge: YEAR })
  redirect('/')
}
