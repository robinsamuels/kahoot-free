import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type AddQuestionPayload = {
  quiz_id: string;                 // uuid/id from quizzes table
  type: "text" | "image_text" | "image_reveal";
  prompt: string;
  image_url?: string | null;
  options: string[];               // 4 options
  correct_index: number;           // 0-3
  time_limit_sec: number;          // e.g., 20
  marks: number;                   // e.g., 100
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const adminPass = req.headers.get("x-admin-pass") ?? body.adminPass;
    if (!adminPass || adminPass !== process.env.ADMIN_PASS) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const p = body as AddQuestionPayload;

    if (!p.quiz_id) return NextResponse.json({ error: "quiz_id required" }, { status: 400 });
    if (!p.prompt?.trim()) return NextResponse.json({ error: "prompt required" }, { status: 400 });
    if (!Array.isArray(p.options) || p.options.length !== 4)
      return NextResponse.json({ error: "options must be an array of 4 strings" }, { status: 400 });
    if (p.correct_index < 0 || p.correct_index > 3)
      return NextResponse.json({ error: "correct_index must be 0-3" }, { status: 400 });
    if (!p.time_limit_sec || p.time_limit_sec < 5)
      return NextResponse.json({ error: "time_limit_sec must be >= 5" }, { status: 400 });
    if (typeof p.marks !== "number" || p.marks <= 0)
      return NextResponse.json({ error: "marks must be > 0" }, { status: 400 });

    const row = {
      quiz_id: p.quiz_id,
      type: p.type,
      prompt: p.prompt.trim(),
      image_url: p.image_url || null,
      options: p.options,
      correct_index: p.correct_index,
      time_limit_sec: p.time_limit_sec,
      marks: p.marks,
    };

    const { data, error } = await supabase
      .from("questions")
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ question: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server error" }, { status: 500 });
  }
}
