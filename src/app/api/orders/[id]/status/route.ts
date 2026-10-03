import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing order id" }, { status: 400 });

  const supabase = adminClient();
  const { data: order, error } = await supabase.from("orders").select("status").eq("id", id).maybeSingle();

  if (error || !order) return NextResponse.json({ status: "unknown" }, { status: 404 });
  return NextResponse.json({ status: order.status }, { headers: { "Cache-Control": "no-store, private" } });
}
