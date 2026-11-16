import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "../../../../lib/session";

export function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return response;
}
