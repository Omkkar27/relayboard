import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/db";
import { User } from "../../../../models/User";
import { readSession } from "../../../../lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = readSession(request);
    await connectToDatabase();
    const user = await User.findById(session.userId)
      .select("username email")
      .lean();
    if (!user) throw new Error("Account not found");
    return NextResponse.json({ success: true, user });
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
}
