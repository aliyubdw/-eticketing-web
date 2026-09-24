import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { startCheckout } from "./checkout/actions";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
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

          {error && (
            <p className="text-sm text-red-400 border border-red-900 bg-red-950/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {ticketTypes && ticketTypes.length > 0 ? (
            ticketTypes.map((tt) => {
              const remaining = tt.quantity - tt.sold_count;
              const soldOut = remaining <= 0;
              const startCheckoutForType = startCheckout.bind(null, id);
              return (
                <details
                  key={tt.id}
                  className="border border-neutral-800 rounded-xl p-4 group"
                >
                  <summary className="flex items-center justify-between cursor-pointer list-none">
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
                      <span
                        className={`bg-neutral-100 text-neutral-900 rounded-lg px-4 py-2 text-sm font-medium ${
                          soldOut ? "opacity-40" : "group-open:hidden"
                        }`}
                      >
                        {soldOut ? "Unavailable" : "Buy"}
                      </span>
                    </div>
                  </summary>

                  {!soldOut && (
                    <form
                      action={startCheckoutForType}
                      className="mt-4 pt-4 border-t border-neutral-800 space-y-3"
                    >
                      <input type="hidden" name="ticket_type_id" value={tt.id} />
                      <div>
                        <label className="text-xs text-neutral-500">Quantity</label>
                        <input
                          name="quantity"
                          type="number"
                          min="1"
                          max={remaining}
                          defaultValue="1"
                          required
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-500">Full name</label>
                        <input
                          name="buyer_name"
                          required
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-500">Email</label>
                        <input
                          name="buyer_email"
                          type="email"
                          required
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-neutral-500">Phone</label>
                        <input
                          name="buyer_phone"
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
                        />
                      </div>
                      <button className="w-full bg-neutral-100 text-neutral-900 rounded-lg py-2 text-sm font-medium">
                        Continue to payment
                      </button>
                    </form>
                  )}
                </details>
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
