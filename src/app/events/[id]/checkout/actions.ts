"use server";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminClient() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function startCheckout(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const ticketTypeId = String(formData.get("ticket_type_id") ?? "");
  const quantity = Number(formData.get("quantity"));
  const buyerName = String(formData.get("buyer_name") ?? "").trim();
  const buyerEmail = String(formData.get("buyer_email") ?? "").trim();
  const buyerPhone = String(formData.get("buyer_phone") ?? "").trim();

  if (!ticketTypeId || !Number.isInteger(quantity) || quantity < 1 || !buyerName || !buyerEmail) {
    redirect("/events/" + eventId + "?error=" + encodeURIComponent("Please fill in all fields"));
  }

  const { data: ticketType } = await supabase.from("ticket_types").select("id, name, price, quantity, sold_count, event_id").eq("id", ticketTypeId).single();
  if (!ticketType || ticketType.event_id !== eventId) redirect("/events/" + eventId + "?error=" + encodeURIComponent("Ticket type not found"));

  const remaining = ticketType.quantity - ticketType.sold_count;
  if (quantity > remaining) redirect("/events/" + eventId + "?error=" + encodeURIComponent("Only " + remaining + " tickets left"));

  const totalAmount = Number(ticketType.price) * quantity;
  const { data: order, error: orderError } = await supabase.from("orders").insert({ event_id: eventId, ticket_type_id: ticketTypeId, quantity, buyer_name: buyerName, buyer_email: buyerEmail, buyer_phone: buyerPhone || null, total_amount: totalAmount, status: "pending" }).select("id").single();
  if (orderError || !order) redirect("/events/" + eventId + "?error=" + encodeURIComponent(orderError?.message ?? "Could not create order"));

  const accessToken = crypto.randomBytes(32).toString("base64url");
  const accessTokenHash = crypto.createHash("sha256").update(accessToken).digest("hex");
  const admin = adminClient();

  const { error: accessError } = await admin.from("ticket_access_sessions").insert({ order_id: order.id, token_hash: accessTokenHash, token_preview: accessToken.slice(0, 12), expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });
  if (accessError) redirect("/events/" + eventId + "?error=" + encodeURIComponent("Could not create secure ticket access. Please try again."));

  const { error: paymentError } = await admin.from("payments").insert({ order_id: order.id, provider: "paystack", amount: totalAmount, status: "pending" });
  if (paymentError) redirect("/events/" + eventId + "?error=" + encodeURIComponent("Could not create payment. Please try again."));

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecret) redirect("/events/" + eventId + "?error=" + encodeURIComponent("Payments are not configured yet — contact the organizer"));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://eticketing-two.vercel.app";
  const callbackUrl = siteUrl + "/events/" + eventId + "/checkout/success?order=" + order.id + "#access_token=" + encodeURIComponent(accessToken);
  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: "Bearer " + paystackSecret, "Content-Type": "application/json" }, body: JSON.stringify({ email: buyerEmail, amount: Math.round(totalAmount * 100), reference: order.id, callback_url: callbackUrl, metadata: { order_id: order.id, event_id: eventId, ticket_type_id: ticketTypeId, quantity } }) });
  const paystackData = await paystackRes.json();
  if (!paystackRes.ok || !paystackData?.data?.authorization_url) redirect("/events/" + eventId + "?error=" + encodeURIComponent(paystackData?.message ?? "Could not start payment"));
  redirect(paystackData.data.authorization_url);
}
