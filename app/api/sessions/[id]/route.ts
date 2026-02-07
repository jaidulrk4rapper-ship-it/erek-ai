import { NextResponse } from "next/server"
import {
  updateSessionTitle,
  setSessionPinned,
  deleteSession,
} from "@/lib/chat-store"

export const runtime = "nodejs"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: "Session id required" }, { status: 400 })
  try {
    const body = await _req.json().catch(() => ({}))
    if (typeof body.title === "string") await updateSessionTitle(id, body.title)
    if (typeof body.pinned === "boolean") await setSessionPinned(id, body.pinned)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: "Session id required" }, { status: 400 })
  try {
    await deleteSession(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
  }
}
