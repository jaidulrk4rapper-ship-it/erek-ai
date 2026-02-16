import crypto from "crypto"

export function checkAdminAuth(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  const auth = req.headers.get("authorization")
  if (!auth) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const actual = Buffer.from(auth)
  if (expected.length !== actual.length) return false
  return crypto.timingSafeEqual(expected, actual)
}
