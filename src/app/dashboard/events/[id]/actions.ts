"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTicketType(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price"));
  const quantity = Number(formData.get("quantity"));

  if (!name || Number.isNaN(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Please provide a valid name, price, and quantity");
  }

  const { error } = await supabase.from("ticket_types").insert({
    event_id: eventId,
    name,
    price,
    quantity,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function deleteTicketType(eventId: string, ticketTypeId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ticket_types")
    .delete()
    .eq("id", ticketTypeId)
    .eq("event_id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}`);
}
