import { redis } from './redis.js'
import { NextResponse } from 'next/server'
import { SESSION_TTL } from './constants.js'
import { randomUUID } from 'crypto'

async function getBcryptjs() {
  return import('bcryptjs')
}

export async function hashPassword(plain) {
  const bcryptjs = await getBcryptjs()
  return bcryptjs.hash(plain, 10)
}

export async function verifyPassword(plain, hash) {
  const bcryptjs = await getBcryptjs()
  return bcryptjs.compare(plain, hash)
}

export async function createSession(userId) {
  const token = randomUUID()
  const expiresAt = Date.now() + SESSION_TTL * 1000

  await redis.hset(`session:${token}`, {
    userId,
    expiresAt: expiresAt.toString(),
  })

  await redis.expire(`session:${token}`, SESSION_TTL)

  return token
}

export async function getSession(req) {
  const token = req.cookies?.get?.('mosen_session')?.value

  if (!token) {
    return null
  }

  const sessionData = await redis.hgetall(`session:${token}`)

  if (!sessionData || !sessionData.userId) {
    return null
  }

  const userData = await redis.hgetall(`user:${sessionData.userId}`)

  return {
    userId: sessionData.userId,
    user: userData || null,
  }
}

export async function requireAuth(req) {
  const session = await getSession(req)

  if (!session) {
    throw new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    )
  }

  return session
}

export function setSessionCookie(response, token) {
  response.cookies.set('mosen_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 604800,
  })

  return response
}
