import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accessToken = typeof body?.access_token === "string" ? body.access_token.trim() : "";
    if (!accessToken || accessToken.length < 32 || accessToken.length > 200) {
      return NextResponse.json({ error: "Invalid access token" }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(accessToken).digest("hex");
    const supabase = adminClient();
    const { data: session, error: sessionError } = await supabase
      .from("ticket_access_sessions")
      .select("order_id, expires_at")
      .eq("token_hash", tokenHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Ticket access link is invalid or expired" }, { status: 401 });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", session.order_id)
      .maybeSingle();

    if (orderError || !order || order.status !== "paid") {
      return NextResponse.json({ error: "Payment has not been confirmed yet" }, { status: 409 });
    }

    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select("id, ticket_code, status, qr_token, ticket_types(name)")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    if (ticketsError || !tickets?.length) {
      return NextResponse.json({ error: "Tickets are not ready yet" }, { status: 404 });
    }

    const safeTickets = tickets.map((ticket: any) => ({
      ticket_id: ticket.id,
      ticket_code: ticket.ticket_code ?? null,
      status: ticket.status,
      ticket_type_name: ticket.ticket_types?.name ?? "Ticket",
      qr_token: ticket.qr_token,
    }));

    return NextResponse.json({ tickets: safeTickets }, { headers: { "Cache-Control": "no-store, private" } });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
