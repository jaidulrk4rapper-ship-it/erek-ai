import { NextResponse } from "next/server"
import crypto from "crypto"
import { getDb } from "@/lib/db"

export const runtime = "nodejs"

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex")
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body.email ?? "").toLowerCase().trim()
    const password = String(body.password ?? "")
    const name = String(body.name ?? "").trim()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    const db = await getDb()
    const existing = await db.get<{ id: string }>("SELECT id FROM users WHERE email = ?", email)
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
    }

    const id = crypto.randomUUID()
    const salt = crypto.randomBytes(32).toString("hex")
    const passwordHash = hashPassword(password, salt)

    await db.run(
      "INSERT INTO users (id, email, name, password_hash, salt, provider, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      id, email, name || "User", passwordHash, salt, "credentials", Date.now()
    )

    return NextResponse.json({ ok: true, message: "Account created successfully" })
  } catch (e) {
    console.error("Signup error:", e)
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
  }
}
