import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const bodyText = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  const expected = crypto.createHmac("sha512", secret ?? "").update(bodyText).digest("hex");

  if (!secret || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(bodyText); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (event.event !== "charge.success") return NextResponse.json({ received: true });

  const reference = String(event.data?.reference ?? "");
  if (!reference) return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });

  const amount = Number(event.data?.amount);
  if (!Number.isFinite(amount)) return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });

  const supabase = adminClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, ticket_type_id, quantity, total_amount, currency, status")
    .eq("id", reference)
    .maybeSingle();

  if (orderError || !order || order.status === "paid" || order.status !== "pending") {
    return NextResponse.json({ received: true });
  }

  if (amount !== Math.round(Number(order.total_amount) * 100)) {
    return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
  }

  const providerReference = String(event.data?.id ?? event.data?.reference ?? reference);
  const ticketRows = Array.from({ length: order.quantity }, () => {
    const rawToken = crypto.randomBytes(24).toString("hex");
    return {
      qr_token: rawToken,
      qr_token_hash: crypto.createHash("sha256").update(rawToken).digest("hex"),
      status: "valid",
    };
  });

  const { error: finalizeError } = await supabase.rpc("finalize_paystack_order", {
    p_order_id: order.id,
    p_provider_reference: providerReference,
    p_webhook_payload: event,
    p_ticket_rows: ticketRows,
  });

  if (finalizeError) {
    console.error("Paystack finalization failed:", finalizeError);
    return NextResponse.json({ error: "Payment received but ticket finalization failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
