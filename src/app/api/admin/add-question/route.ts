import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ChoiceIn =
  | string
  | {
      body: string;
      is_correct?: boolean;
    };

type Payload = {
  quiz_id: string;          // maps to questions.quiz_set_id
  body: string;             // question text
  image_url?: string | null;
  order?: number;           // if omitted, we'll set max+1
  choices: ChoiceIn[];      // 4 options
  correct_index?: number;   // required if choices are strings
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Payload & { adminPass?: string };
    const pin = req.headers.get("x-admin-pass") ?? body.adminPass ?? "";

    if (!process.env.ADMIN_PASS) {
      return NextResponse.json({ error: "ADMIN_PASS env not set" }, { status: 500 });
    }
    if (pin !== process.env.ADMIN_PASS) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate payload
    if (!body.quiz_id) return NextResponse.json({ error: "quiz_id required" }, { status: 400 });
    if (!body.body?.trim()) return NextResponse.json({ error: "body (question) required" }, { status: 400 });
    if (!Array.isArray(body.choices) || body.choices.length < 2)
      return NextResponse.json({ error: "choices must have at least 2 items" }, { status: 400 });

    // Build normalized choices [{body, is_correct}, ...]
    let normalized: { body: string; is_correct: boolean }[] = [];

    if (typeof body.choices[0] === "string") {
      const opts = body.choices as string[];
      if (body.correct_index == null || body.correct_index < 0 || body.correct_index >= opts.length) {
        return NextResponse.json({ error: "correct_index must be within choices range" }, { status: 400 });
      }
      normalized = opts.map((t, i) => ({
        body: String(t),
        is_correct: i === body.correct_index,
      }));
    } else {
      const opts = body.choices as { body: string; is_correct?: boolean }[];
      const withBodies = opts.map((o) => ({ body: (o.body ?? "").trim(), is_correct: !!o.is_correct }));
      if (withBodies.some((o) => !o.body)) {
        return NextResponse.json({ error: "each choice must have body text" }, { status: 400 });
      }
      const correctCount = withBodies.filter((o) => o.is_correct).length;
      if (correctCount !== 1) {
        return NextResponse.json({ error: "exactly one choice must be is_correct:true" }, { status: 400 });
      }
      normalized = withBodies;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(url, serviceRole);

    // Determine the sequence ("order") if not provided
    let seq = body.order;
    if (seq == null) {
      const { data: lastQ, error: lastErr } = await supabase
        .from("questions")
        .select("order")
        .eq("quiz_set_id", body.quiz_id)
        .order("order", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastErr && lastErr.code !== "PGRST116") throw lastErr; // ignore 'no rows' error
      const last = (lastQ as any)?.order ?? 0;
      seq = Number.isFinite(last) ? (last as number) + 1 : 0;
    }

    // 1) Insert question
    const questionRow = {
      quiz_set_id: body.quiz_id,
      body: body.body.trim(),
      image_url: body.image_url ?? null,
      order: seq!,
    };

    const { data: q, error: qErr } = await supabase
      .from("questions")
      .insert(questionRow)
      .select("id, body, image_url, order, quiz_set_id, created_at")
      .single();

    if (qErr) throw qErr;

    // 2) Insert choices
    const choicesRows = normalized.map((c) => ({
      question_id: q.id,
      body: c.body,
      is_correct: c.is_correct,
    }));

    const { data: insertedChoices, error: cErr } = await supabase
      .from("choices")
      .insert(choicesRows)
      .select("id, body, is_correct, created_at");

    if (cErr) {
      // cleanup orphaned question
      await supabase.from("questions").delete().eq("id", q.id);
      throw cErr;
    }

    return NextResponse.json(
      {
        question: q,
        choices: insertedChoices ?? [],
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

