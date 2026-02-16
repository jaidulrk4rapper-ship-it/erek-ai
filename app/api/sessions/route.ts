import { NextResponse } from "next/server"
import { getSessionsWithTitle } from "@/lib/chat-store"
import { getUserId } from "@/lib/get-user"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const sessions = await getSessionsWithTitle(userId, 50)
    return NextResponse.json({ sessions })
  } catch (e) {
    return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 })
  }
}
