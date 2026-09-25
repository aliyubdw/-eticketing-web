import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const supabase = await createClient();

  let status: "paid" | "pending" | "unknown" = "unknown";

  if (orderId) {
    // Poll briefly for the webhook to land
    for (let i = 0; i < 6; i++) {
      const { data } = await supabase
        .from("order_status_public")
        .select("status")
        .eq("id", orderId)
        .maybeSingle();

      if (data?.status === "paid") {
        status = "paid";
        break;
      }
      if (data?.status === "pending") {
        status = "pending";
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  let tickets: { ticket_id: string; ticket_type_name: string; qr_dataurl: string }[] = [];

  if (status === "paid" && orderId) {
    const { data: revealedTickets } = await supabase
      .from("ticket_reveal_public")
      .select("ticket_id, ticket_type_name, qr_token")
      .eq("order_id", orderId);

    if (revealedTickets) {
      tickets = await Promise.all(
        revealedTickets.map(async (t) => ({
          ticket_id: t.ticket_id,
          ticket_type_name: t.ticket_type_name,
          qr_dataurl: await QRCode.toDataURL(t.qr_token, { margin: 1, width: 220 }),
        }))
      );
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "paid" ? (
          <>
            <h1 className="text-2xl font-semibold">Payment confirmed 🎉</h1>
            <p className="text-neutral-400">
              Save these tickets — you&apos;ll need to show the QR code at the door.
            </p>
            <div className="space-y-4">
              {tickets.map((t, i) => (
                <div
                  key={t.ticket_id}
                  className="border border-neutral-800 rounded-xl p-5 flex flex-col items-center gap-3"
                >
                  <p className="text-sm text-neutral-400">
                    {t.ticket_type_name} · Ticket {i + 1} of {tickets.length}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.qr_dataurl}
                    alt={`QR code for ${t.ticket_type_name} ticket`}
                    className="rounded-lg bg-white p-2"
                    width={220}
                    height={220}
                  />
                  <p className="text-[10px] text-neutral-600 break-all">{t.ticket_id}</p>
                </div>
              ))}
            </div>
          </>
        ) : status === "pending" ? (
          <>
            <h1 className="text-2xl font-semibold">Confirming your payment…</h1>
            <p className="text-neutral-400">
              This is taking a little longer than usual. Refresh this page in a moment —
              your tickets will appear once payment is confirmed.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Thanks!</h1>
            <p className="text-neutral-400">
              We&apos;re confirming your payment. Refresh in a moment to see your tickets.
            </p>
          </>
        )}
        <Link href="/" className="inline-block text-sm text-neutral-300 underline">
          Back to events
        </Link>
      </div>
    </main>
  );
}
