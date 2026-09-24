import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { createOrganization, publishEvent, signOut } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  const orgIds = organizations?.map((o) => o.id) ?? [];
  const { data: events } = orgIds.length
    ? await supabase
        .from("events")
        .select("id, name, venue, start_time, status, organization_id")
        .in("organization_id", orgIds)
        .order("start_time", { ascending: true })
    : { data: [] };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Organizer Dashboard</h1>
            <p className="text-sm text-neutral-500">{user.email}</p>
          </div>
          <form action={signOut}>
            <button className="text-sm text-neutral-400 hover:text-neutral-200 underline">
              Sign out
            </button>
          </form>
        </div>

        {/* Organizations */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Your Organizations</h2>

          {organizations && organizations.length > 0 ? (
            <ul className="text-sm text-neutral-400 space-y-1">
              {organizations.map((org) => (
                <li key={org.id}>· {org.name}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">
              You don&apos;t have an organization yet. Create one to start listing events.
            </p>
          )}

          <form action={createOrganization} className="flex gap-2 max-w-md">
            <input
              name="name"
              placeholder="Organization name"
              required
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
            <button className="bg-neutral-100 text-neutral-900 rounded-lg px-4 py-2 text-sm font-medium">
              Add
            </button>
          </form>
        </section>

        {/* Events list */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Your Events</h2>
            <Link
              href="/dashboard/events/new"
              className="text-sm rounded-lg bg-neutral-100 text-neutral-900 px-4 py-2 font-medium hover:bg-white transition-colors"
            >
              + New event
            </Link>
          </div>
          {events && events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border border-neutral-800 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <Link
                      href={`/dashboard/events/${event.id}`}
                      className="font-medium hover:underline"
                    >
                      {event.name}
                    </Link>
                    <p className="text-sm text-neutral-500">
                      {event.venue ?? "Venue TBA"} ·{" "}
                      {new Date(event.start_time).toLocaleString("en-NG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        event.status === "published"
                          ? "bg-green-900 text-green-300"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {event.status}
                    </span>
                    {event.status === "draft" && (
                      <form action={publishEvent.bind(null, event.id)}>
                        <button className="text-xs underline text-neutral-300">
                          Publish
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No events yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
