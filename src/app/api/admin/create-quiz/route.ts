import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const pin = req.headers.get("x-admin-pass") ?? body.adminPass ?? "";
    if (!process.env.ADMIN_PASS) {
      return NextResponse.json({ error: "ADMIN_PASS env not set" }, { status: 500 });
    }
    if (pin !== process.env.ADMIN_PASS) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const title = (body.title ?? body.name ?? "").trim();
    const description = typeof body.description === "string" ? body.description.trim() : null;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(url, serviceRole);

    const { data, error } = await supabase
      .from("quiz_sets")
      .insert({ name: title, description })
      .select("id, name, description, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        quiz: {
          id: data.id,
          title: data.name,
          description: data.description ?? null,
          created_at: data.created_at,
        },
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

