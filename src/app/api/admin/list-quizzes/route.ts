import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const pin = req.headers.get("x-admin-pass") ?? "";
    if (!process.env.ADMIN_PASS) {
      return NextResponse.json({ error: "ADMIN_PASS env not set" }, { status: 500 });
    }
    if (pin !== process.env.ADMIN_PASS) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceRole) {
      return NextResponse.json({ error: "Supabase envs missing" }, { status: 500 });
    }

    const supabase = createClient(url, serviceRole);

    const { data, error } = await supabase
      .from("quiz_sets")
      .select("id, name, description, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Keep admin UI shape stable: title instead of name
    const quizzes = (data ?? []).map((q) => ({
      id: q.id,
      title: q.name,
      description: q.description ?? null,
      created_at: q.created_at,
    }));

    return NextResponse.json({ quizzes }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
