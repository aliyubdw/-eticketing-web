import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CheckInScanner from "./scanner";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("events")
    .select("id, name, organizations(owner_id)")
    .eq("id", id)
    .single();

  const ownerId = (event?.organizations as unknown as { owner_id: string } | null)?.owner_id;
  if (!event || ownerId !== user.id) notFound();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-12">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <Link href={`/dashboard/events/${id}`} className="text-sm text-neutral-500 hover:text-neutral-300">
            ← Back to event
          </Link>
          <h1 className="text-2xl font-semibold mt-2">Check-in: {event.name}</h1>
        </div>
        <CheckInScanner eventId={id} />
      </div>
    </main>
  );
}
