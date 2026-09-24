"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function startCheckout(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const ticketTypeId = String(formData.get("ticket_type_id"));
  const quantity = Number(formData.get("quantity"));
  const buyerName = String(formData.get("buyer_name") ?? "").trim();
  const buyerEmail = String(formData.get("buyer_email") ?? "").trim();
  const buyerPhone = String(formData.get("buyer_phone") ?? "").trim();

  if (!ticketTypeId || !quantity || quantity < 1 || !buyerName || !buyerEmail) {
    redirect(`/events/${eventId}?error=${encodeURIComponent("Please fill in all fields")}`);
  }

  // Re-check availability server-side
  const { data: ticketType } = await supabase
    .from("ticket_types")
    .select("id, name, price, quantity, sold_count, event_id")
    .eq("id", ticketTypeId)
    .single();

  if (!ticketType || ticketType.event_id !== eventId) {
    redirect(`/events/${eventId}?error=${encodeURIComponent("Ticket type not found")}`);
  }

  const remaining = ticketType!.quantity - ticketType!.sold_count;
  if (quantity > remaining) {
    redirect(
      `/events/${eventId}?error=${encodeURIComponent(`Only ${remaining} tickets left`)}`
    );
  }

  const totalAmount = Number(ticketType!.price) * quantity;

  // Create the pending order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      event_id: eventId,
      ticket_type_id: ticketTypeId,
      quantity,
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: buyerPhone || null,
      total_amount: totalAmount,
      status: "pending",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    redirect(
      `/events/${eventId}?error=${encodeURIComponent(orderError?.message ?? "Could not create order")}`
    );
  }

  // Create a pending payment record
  await supabase.from("payments").insert({
    order_id: order!.id,
    provider: "paystack",
    amount: totalAmount,
    status: "pending",
  });

  // Initialize Paystack transaction
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecret) {
    redirect(
      `/events/${eventId}?error=${encodeURIComponent(
        "Payments aren't configured yet — contact the organizer"
      )}`
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://eticketing-two.vercel.app";

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: buyerEmail,
      amount: Math.round(totalAmount * 100), // kobo
      reference: order!.id,
      callback_url: `${siteUrl}/events/${eventId}/checkout/success?order=${order!.id}`,
      metadata: {
        order_id: order!.id,
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        quantity,
      },
    }),
  });

  const paystackData = await paystackRes.json();

  if (!paystackRes.ok || !paystackData?.data?.authorization_url) {
    redirect(
      `/events/${eventId}?error=${encodeURIComponent(
        paystackData?.message ?? "Could not start payment"
      )}`
    );
  }

  redirect(paystackData.data.authorization_url);
}
