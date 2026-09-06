import React from "react"
import type { Metadata } from 'next'
import { Toaster } from "sonner"
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthGuard } from "@/components/auth/auth-guard"
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Heat Pump & SWH Project Manager',
  description: 'Manage Heat Pump and Solar Water Heater installation projects',
  icons: {
    icon: [
      {
        url: '/icon.png',
        sizes: 'any',
      },
      {
        url: '/favicon.ico',
        sizes: 'any',
      },
    ],
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} scroll-smooth`}>
      <body className="font-sans antialiased text-foreground selection:bg-primary/20 selection:text-primary">
        <AuthGuard>
          {children}
        </AuthGuard>
        <Toaster closeButton position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  )
}
