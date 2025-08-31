import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const adminPass = req.headers.get("x-admin-pass") ?? body.adminPass;
    if (!adminPass || adminPass !== process.env.ADMIN_PASS) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = body as { title: string };
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("quizzes")
      .insert({ title: title.trim() })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ quiz: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server error" }, { status: 500 });
  }
}
