import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { getMessages } from "@/lib/chat-store"

export const runtime = "nodejs"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  if (!id) return NextResponse.json({ error: "Session id required" }, { status: 400 })
  try {
    const messages = await getMessages(id, 200)
    return NextResponse.json({ messages })
  } catch (e) {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
  }
}
