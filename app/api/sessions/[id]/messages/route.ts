import { NextResponse } from "next/server"
import { getMessages } from "@/lib/chat-store"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: "Session id required" }, { status: 400 })
  try {
    const messages = await getMessages(id)
    return NextResponse.json({ messages })
  } catch (e) {
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
  }
}
