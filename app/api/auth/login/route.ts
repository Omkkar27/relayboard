import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";
import { User } from "../../../../models/User";
import { attachSession, createSession } from "../../../../lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    await connectToDatabase();
    const user = await User.findOne({ email }).lean();
    if (!user || !(await bcrypt.compare(password, user.password)))
      return NextResponse.json(
        { error: "Email or password is incorrect." },
        { status: 401 },
      );
    const response = NextResponse.json({
      success: true,
      user: { username: user.username, email: user.email },
    });
    attachSession(
      response,
      createSession({
        id: String(user._id),
        username: user.username,
        email: user.email,
      }),
    );
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sign in." },
      { status: 503 },
    );
  }
}
