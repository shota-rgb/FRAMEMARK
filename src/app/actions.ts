'use server'

import { cookies } from 'next/headers'

type SeenEntry = { id: string; status: string }

export async function markVideoSeen(videoId: string, status: string) {
  const cookieStore = await cookies()
  let seen: SeenEntry[] = []
  try {
    const raw = cookieStore.get('seen_videos')?.value
    seen = raw ? JSON.parse(raw) : []
  } catch { seen = [] }

  if (!seen.some((s) => s.id === videoId && s.status === status)) {
    seen.push({ id: videoId, status })
    cookieStore.set('seen_videos', JSON.stringify(seen.slice(-300)), {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      httpOnly: true,
    })
  }
}
