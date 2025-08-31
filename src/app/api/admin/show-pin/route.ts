import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET() {
  if (process.env.DEBUG_ENABLE_PIN_ECHO !== "1") {
    return NextResponse.json({ error: "Disabled" }, { status: 403 });
  }
  return NextResponse.json({
    adminPass: process.env.ADMIN_PASS ?? null,
  });
}
