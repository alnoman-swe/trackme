import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Step 1: send the browser to Google's sign-in page.
export async function GET() {
  const state = randomBytes(16).toString('hex')
  ;(await cookies()).set('oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600, path: '/auth' })
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.APP_URL}/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state,
  })
  if (process.env.GOOGLE_ALLOWED_DOMAIN) params.set('hd', process.env.GOOGLE_ALLOWED_DOMAIN)
  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
