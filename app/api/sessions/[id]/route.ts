import { NextResponse } from "next/server"
import {
  updateSessionTitle,
  setSessionPinned,
  deleteSession,
} from "@/lib/chat-store"
import { getUserId } from "@/lib/get-user"

export const runtime = "nodejs"

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(_req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  if (!id) return NextResponse.json({ error: "Session id required" }, { status: 400 })
  try {
    const body = await _req.json().catch(() => ({}))
    if (typeof body.title === "string") await updateSessionTitle(id, userId, body.title)
    if (typeof body.pinned === "boolean") await setSessionPinned(id, userId, body.pinned)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(_req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  if (!id) return NextResponse.json({ error: "Session id required" }, { status: 400 })
  try {
    await deleteSession(id, userId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
  }
}
