import { NextResponse } from "next/server";
import { getSummary } from "../../../lib/proxy-store";

export function GET() {
  return NextResponse.json({ success: true, data: getSummary() });
}
