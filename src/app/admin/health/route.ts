import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const hasAdminPass = !!process.env.ADMIN_PASS;
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  let canQuery = false;
  try {
    if (hasServiceRole && hasUrl) {
      const s = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await s.from("quizzes").select("id").limit(1);
      canQuery = true;
    }
  } catch {}

  return NextResponse.json({ hasAdminPass, hasServiceRole, hasUrl, canQuery });
}
