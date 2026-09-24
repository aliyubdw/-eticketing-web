import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

// Service-role client: bypasses RLS. Never expose this key to the browser.
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const bodyText = await req.text();

  // Verify the webhook actually came from Paystack
  const signature = req.headers.get("x-paystack-signature");
  const expected = crypto.createHmac("sha512", secret ?? "").update(bodyText).digest("hex");

  if (!secret || signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(bodyText);

  if (event.event !== "charge.success") {
    // Ignore all other event types
    return NextResponse.json({ received: true });
  }

  const orderId = event.data.reference;
  const supabase = adminClient();

  // Idempotency: if this order's payment is already succeeded, do nothing
  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id, status")
    .eq("order_id", orderId)
    .single();

  if (!existingPayment || existingPayment.status === "succeeded") {
    return NextResponse.json({ received: true });
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, ticket_type_id, quantity, status")
    .eq("id", orderId)
    .single();

  if (!order || order.status !== "pending") {
    return NextResponse.json({ received: true });
  }

  // Mark payment succeeded
  await supabase
    .from("payments")
    .update({
      status: "succeeded",
      provider_reference: event.data.id?.toString(),
      raw_webhook_payload: event,
    })
    .eq("order_id", orderId);

  // Mark order paid
  await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);

  // Issue tickets: one row per quantity, each with a unique hashed QR token
  const ticketRows = Array.from({ length: order.quantity }).map(() => {
    const rawToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    return {
      order_id: order.id,
      ticket_type_id: order.ticket_type_id,
      qr_token_hash: tokenHash,
      status: "valid" as const,
    };
  });

  await supabase.from("tickets").insert(ticketRows);

  // Increment sold_count on the ticket type
  const { data: ticketType } = await supabase
    .from("ticket_types")
    .select("sold_count")
    .eq("id", order.ticket_type_id)
    .single();

  if (ticketType) {
    await supabase
      .from("ticket_types")
      .update({ sold_count: ticketType.sold_count + order.quantity })
      .eq("id", order.ticket_type_id);
  }

  return NextResponse.json({ received: true });
}
