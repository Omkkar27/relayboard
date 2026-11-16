import jwt, { JwtPayload } from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "relayboard_session";
type Session = JwtPayload & { userId: string; username: string; email: string };

export function createSession(user: { id: string; username: string; email: string }) {
  if (!process.env.TOKEN_SECRET) throw new Error("TOKEN_SECRET is not configured.");
  return jwt.sign({ userId: user.id, username: user.username, email: user.email }, process.env.TOKEN_SECRET, { expiresIn: "7d" });
}

export function readSession(request: NextRequest): Session {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !process.env.TOKEN_SECRET) throw new Error("Not authenticated");
  const payload = jwt.verify(token, process.env.TOKEN_SECRET);
  if (typeof payload === "string" || !payload.userId) throw new Error("Invalid session");
  return payload as Session;
}

export function attachSession(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
