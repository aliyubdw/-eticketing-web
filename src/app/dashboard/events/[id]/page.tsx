import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createTicketType, deleteTicketType } from "./actions";

export default async function ManageEventPage({
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
    .select("id, name, venue, start_time, status, organization_id, organizations(owner_id)")
    .eq("id", id)
    .single();

  if (!event || (event.organizations as unknown as { owner_id: string })?.owner_id !== user.id) {
    notFound();
  }

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, name, price, quantity, sold_count")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  const createTicketTypeForEvent = createTicketType.bind(null, id);
  const deleteTicketTypeForEvent = deleteTicketType.bind(null, id);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-300">
            ← Back to dashboard
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-2xl font-semibold">{event.name}</h1>
              <p className="text-sm text-neutral-500">
                {event.venue ?? "Venue TBA"} ·{" "}
                {new Date(event.start_time).toLocaleString("en-NG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                · <span className="uppercase">{event.status}</span>
              </p>
            </div>
            <Link
              href={`/dashboard/events/${id}/checkin`}
              className="text-sm rounded-lg border border-neutral-700 px-4 py-2 hover:border-neutral-500 transition-colors whitespace-nowrap"
            >
              Check-in scanner
            </Link>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-medium">Ticket Types</h2>

          {ticketTypes && ticketTypes.length > 0 ? (
            <div className="space-y-2">
              {ticketTypes.map((tt) => (
                <div
                  key={tt.id}
                  className="border border-neutral-800 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{tt.name}</p>
                    <p className="text-sm text-neutral-500">
                      ₦{Number(tt.price).toLocaleString()} · {tt.sold_count}/{tt.quantity} sold
                    </p>
                  </div>
                  <form action={deleteTicketTypeForEvent.bind(null, tt.id)}>
                    <button className="text-xs text-red-400 hover:text-red-300 underline">
                      Remove
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              No ticket types yet. Add one below — buyers can&apos;t purchase until you do.
            </p>
          )}

          <form action={createTicketTypeForEvent} className="border border-neutral-800 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-neutral-300">Add ticket type</p>
            <input
              name="name"
              placeholder="e.g. Regular, VIP, Early Bird"
              required
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-500">Price (₦)</label>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500">Quantity available</label>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  required
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
                />
              </div>
            </div>
            <button className="w-full bg-neutral-100 text-neutral-900 rounded-lg py-2 text-sm font-medium">
              Add ticket type
            </button>
          </form>
        </section>

        {ticketTypes && ticketTypes.length > 0 && event.status === "draft" && (
          <p className="text-sm text-neutral-500">
            Ready to sell? Go back to the dashboard and hit <strong>Publish</strong> on this
            event to make it visible to buyers.
          </p>
        )}
      </div>
    </main>
  );
}
