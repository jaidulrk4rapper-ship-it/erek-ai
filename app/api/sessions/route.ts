import { NextResponse } from "next/server"
import { getSessionsWithTitle } from "@/lib/chat-store"

export const runtime = "nodejs"

export async function GET() {
  try {
    const sessions = await getSessionsWithTitle(50)
    return NextResponse.json({ sessions })
  } catch (e) {
    return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 })
  }
}
