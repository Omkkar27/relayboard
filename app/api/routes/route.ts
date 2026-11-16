import { NextResponse } from "next/server";
import { addRoute, listRoutes } from "../../../lib/proxy-store";

export function GET() {
  return NextResponse.json({ success: true, data: listRoutes() });
}
export async function POST(request: Request) {
  const body: any = await request.json().catch(() => null);
  const pathPrefix = body?.match?.pathPrefix;
  const upstream = body?.upstream;
  if (
    typeof pathPrefix !== "string" ||
    !pathPrefix.startsWith("/") ||
    typeof upstream !== "string"
  )
    return NextResponse.json(
      { success: false, error: "Enter a valid path prefix and upstream URL." },
      { status: 400 },
    );
  try {
    new URL(upstream);
  } catch {
    return NextResponse.json(
      { success: false, error: "Upstream must be a valid URL." },
      { status: 400 },
    );
  }
  return NextResponse.json(
    {
      success: true,
      data: addRoute({
        match: { pathPrefix },
        upstream,
        stripPrefix: Boolean(body.stripPrefix),
      }),
    },
    { status: 201 },
  );
}
