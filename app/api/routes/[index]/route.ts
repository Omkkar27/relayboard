import { NextResponse } from "next/server";
import { removeRoute } from "../../../../lib/proxy-store";

export async function DELETE(
  _request: Request,
  { params }: { params: { index: string } },
) {
  const index = Number(params.index);
  const removed = Number.isInteger(index) ? removeRoute(index) : null;
  if (!removed)
    return NextResponse.json(
      { success: false, error: "Route not found" },
      { status: 404 },
    );
  return NextResponse.json({ success: true, data: removed });
}
