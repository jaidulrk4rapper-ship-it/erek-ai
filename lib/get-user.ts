import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

export async function getUserId(req: Request): Promise<string | null> {
  const token = await getToken({
    req: req as unknown as NextRequest,
    secret: process.env.NEXTAUTH_SECRET,
  })
  return token?.sub ?? null
}
