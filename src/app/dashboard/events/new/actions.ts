"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createEvent(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Find or create the organizer's organization
  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  let organizationId = existingOrg?.id;

  if (!organizationId) {
    const { data: newOrg, error: orgError } = await supabase
      .from("organizations")
      .insert({
        owner_id: user.id,
        name: (formData.get("organizer_name") as string) || "My Organization",
      })
      .select("id")
      .single();

    if (orgError || !newOrg) {
      redirect(
        `/dashboard/events/new?error=${encodeURIComponent(
          orgError?.message ?? "Could not create organization"
        )}`
      );
    }
    organizationId = newOrg!.id;
  }

  const name = formData.get("name") as string;
  const venue = formData.get("venue") as string;
  const description = formData.get("description") as string;
  const startTime = formData.get("start_time") as string;

  const { error } = await supabase.from("events").insert({
    organization_id: organizationId,
    name,
    venue,
    description,
    start_time: new Date(startTime).toISOString(),
    status: "draft",
  });

  if (error) {
    redirect(`/dashboard/events/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
