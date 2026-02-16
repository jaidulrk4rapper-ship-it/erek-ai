import { NextResponse } from "next/server"
import { checkAdminAuth } from "@/lib/admin-auth"
import { deleteSessionAdmin } from "@/lib/chat-store"

export const runtime = "nodejs"

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  if (!id) return NextResponse.json({ error: "Session id required" }, { status: 400 })
  try {
    await deleteSessionAdmin(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
  }
}
