import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { getSessionsWithTitle } from "@/lib/chat-store"

export const runtime = "nodejs"

export async function GET(req: Request) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const sessions = await getSessionsWithTitle(50)
    return NextResponse.json({ sessions })
  } catch (e) {
    return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 })
  }
}
