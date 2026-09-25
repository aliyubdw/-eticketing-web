"use server";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

export type CheckInResult =
  | { ok: true; message: string; ticketTypeName?: string }
  | { ok: false; message: string };

export async function checkInTicket(eventId: string, rawToken: string): Promise<CheckInResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  // Confirm this user owns the event (organizer-only check-in for now)
  const { data: event } = await supabase
    .from("events")
    .select("id, organizations(owner_id)")
    .eq("id", eventId)
    .single();

  const ownerId = (event?.organizations as unknown as { owner_id: string } | null)?.owner_id;
  if (!event || ownerId !== user.id) {
    return { ok: false, message: "Not authorized for this event" };
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken.trim()).digest("hex");

  // Tickets are locked to service-role for direct table access from clients,
  // but organizers verifying their own event's tickets is a legitimate case —
  // done here via a dedicated RPC that runs with elevated rights and checks
  // event ownership itself.
  const { data, error } = await supabase.rpc("check_in_ticket_for_owner", {
    p_token_hash: tokenHash,
    p_event_id: eventId,
    p_owner_id: user.id,
  });

  if (error) return { ok: false, message: error.message };

  const result = data as { status: string; ticket_type_name?: string } | null;

  if (!result) return { ok: false, message: "Ticket not found" };
  if (result.status === "already_used") {
    return { ok: false, message: `Already checked in (${result.ticket_type_name ?? ""})` };
  }
  if (result.status === "wrong_event") {
    return { ok: false, message: "This ticket is for a different event" };
  }
  if (result.status === "checked_in") {
    return { ok: true, message: "Valid ticket — checked in", ticketTypeName: result.ticket_type_name };
  }
  return { ok: false, message: "Invalid ticket" };
}
