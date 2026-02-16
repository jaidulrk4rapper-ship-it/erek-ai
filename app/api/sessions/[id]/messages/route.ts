import { NextResponse } from "next/server"
import { getMessages, verifySessionOwner } from "@/lib/chat-store"
import { getUserId } from "@/lib/get-user"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(_req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  if (!id) return NextResponse.json({ error: "Session id required" }, { status: 400 })
  try {
    const isOwner = await verifySessionOwner(id, userId)
    if (!isOwner) return NextResponse.json({ error: "Session not found" }, { status: 404 })
    const messages = await getMessages(id)
    return NextResponse.json({ messages })
  } catch (e) {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
  }
}
