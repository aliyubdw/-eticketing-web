"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createOrganization(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Organization name is required");

  const { error } = await supabase
    .from("organizations")
    .insert({ name, owner_id: user.id });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function publishEvent(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ status: "published" })
    .eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}
