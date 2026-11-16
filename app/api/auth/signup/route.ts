import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";
import { User } from "../../../../models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    if (
      username.length < 2 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      password.length < 8
    )
      return NextResponse.json(
        {
          error: "Use a valid email and a password with at least 8 characters.",
        },
        { status: 400 },
      );
    await connectToDatabase();
    const exists = await User.exists({ $or: [{ email }, { username }] });
    if (exists)
      return NextResponse.json(
        { error: "An account with that email or username already exists." },
        { status: 409 },
      );
    await User.create({
      username,
      email,
      password: await bcrypt.hash(password, 12),
    });
    return NextResponse.json(
      { success: true, message: "Account created. You can now sign in." },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create account.",
      },
      { status: 503 },
    );
  }
}
