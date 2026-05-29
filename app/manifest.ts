import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UnitLift Admin',
    short_name: 'Admin',
    description: 'UnitLift internal admin dashboard',
    start_url: '/',
    display: 'standalone',
    background_color: '#080818',
    theme_color: '#080818',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
