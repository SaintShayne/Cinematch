import './globals.css'
import { AuthProvider } from '../lib/context/AuthContext'
import AppShell from '../components/layout/AppShell'

export const metadata = {
  title: 'CineMatch | Movie Discovery',
  description:
    'Discover your next favourite film with AI-powered recommendations, semantic search, and personalised watchlists.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
