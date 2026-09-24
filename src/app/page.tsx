import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: events, error } = await supabase
    .from("events")
    .select("id, name, venue, start_time, description")
    .eq("status", "published")
    .order("start_time", { ascending: true });

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              Upcoming Events
            </h1>
            <p className="text-neutral-400">
              Find and book tickets for events happening near you.
            </p>
          </div>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="text-sm rounded-lg border border-neutral-700 px-4 py-2 hover:border-neutral-500 transition-colors whitespace-nowrap"
          >
            {user ? "Dashboard" : "Organizer login"}
          </Link>
        </div>

        {error && (
          <p className="text-red-400">Couldn&apos;t load events: {error.message}</p>
        )}

        {!error && events?.length === 0 && (
          <p className="text-neutral-500">
            No published events yet. Check back soon.
          </p>
        )}

        <div className="space-y-4">
          {events?.map((event) => (
            <div
              key={event.id}
              className="border border-neutral-800 rounded-xl p-5 hover:border-neutral-600 transition-colors"
            >
              <h2 className="text-lg font-medium">{event.name}</h2>
              <p className="text-sm text-neutral-400 mt-1">
                {event.venue ?? "Venue TBA"} ·{" "}
                {new Date(event.start_time).toLocaleString("en-NG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              {event.description && (
                <p className="text-sm text-neutral-500 mt-2">
                  {event.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
