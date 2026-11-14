import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import './globals.css'

const body = Figtree({ subsets: ['latin'] })
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--display' })

export const metadata = { title: 'TrackMe', description: 'What the team got done today' }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${body.className} ${display.variable}`}>{children}</body>
    </html>
  )
}
