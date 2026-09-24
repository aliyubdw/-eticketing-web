import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createEvent } from "./actions";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await searchParams;

  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-16">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Create event</h1>

        {error && (
          <p className="text-sm text-red-400 mb-4 border border-red-900 bg-red-950/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <form action={createEvent} className="space-y-4">
          {!existingOrg && (
            <div>
              <label className="block text-sm text-neutral-400 mb-1" htmlFor="organizer_name">
                Organizer / company name
              </label>
              <input
                id="organizer_name"
                name="organizer_name"
                type="text"
                required
                placeholder="e.g. Bindawa Events"
                className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-neutral-400 mb-1" htmlFor="name">
              Event name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1" htmlFor="venue">
              Venue
            </label>
            <input
              id="venue"
              name="venue"
              type="text"
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1" htmlFor="start_time">
              Date &amp; time
            </label>
            <input
              id="start_time"
              name="start_time"
              type="datetime-local"
              required
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-neutral-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-100 text-neutral-900 font-medium py-2 text-sm hover:bg-white transition-colors"
          >
            Create event (saved as draft)
          </button>
        </form>
      </div>
    </main>
  );
}
