'use client'

import { Suspense, useState } from 'react'
import { usePathname } from 'next/navigation'
import TopNav from './TopNav'
import SidebarNav from './SidebarNav'
import AdminShell from './AdminShell'
import ChatWidget from '../chat/ChatWidget'
import { WatchlistProvider } from '../../lib/context/WatchlistContext'

export default function AppShell({ children }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Admin pages get their own clean shell — no movie sidebar or search bar
  if (pathname?.startsWith('/admin')) {
    return <AdminShell>{children}</AdminShell>
  }

  return (
    <WatchlistProvider>
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <SidebarNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-[240px]">
        {/* TopNav uses useSearchParams — must be inside Suspense for static prerendering */}
        <Suspense fallback={<div className="h-14" />}>
          <TopNav onMenuClick={() => setSidebarOpen((v) => !v)} />
        </Suspense>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-screen-2xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Floating chat widget */}
      <ChatWidget />
    </div>
    </WatchlistProvider>
  )
}
