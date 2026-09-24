import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, name, venue, description, start_time, status")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, name, price, quantity, sold_count")
    .eq("event_id", id)
    .order("price", { ascending: true });

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-300">
          ← All events
        </Link>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{event.name}</h1>
          <p className="text-neutral-400 mt-1">
            {event.venue ?? "Venue TBA"} ·{" "}
            {new Date(event.start_time).toLocaleString("en-NG", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
          {event.description && (
            <p className="text-neutral-500 mt-4">{event.description}</p>
          )}
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Tickets</h2>

          {ticketTypes && ticketTypes.length > 0 ? (
            ticketTypes.map((tt) => {
              const remaining = tt.quantity - tt.sold_count;
              const soldOut = remaining <= 0;
              return (
                <div
                  key={tt.id}
                  className="border border-neutral-800 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{tt.name}</p>
                    <p className="text-sm text-neutral-500">
                      {soldOut ? "Sold out" : `${remaining} left`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">
                      ₦{Number(tt.price).toLocaleString()}
                    </span>
                    <button
                      disabled={soldOut}
                      className="bg-neutral-100 text-neutral-900 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {soldOut ? "Unavailable" : "Buy"}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-neutral-500">
              Tickets for this event aren&apos;t available yet — check back soon.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
