import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const supabase = await createClient();

  // Note: orders/tickets are locked to service-role only, so this page
  // can only confirm the order exists via a light public check once
  // payment status catches up (webhook may take a few seconds).
  let status: "paid" | "pending" | "unknown" = "unknown";

  if (orderId) {
    // Poll briefly for the webhook to land
    for (let i = 0; i < 5; i++) {
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

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        {status === "paid" ? (
          <>
            <h1 className="text-2xl font-semibold">Payment confirmed 🎉</h1>
            <p className="text-neutral-400">
              Your tickets have been issued. A confirmation was sent to your email.
            </p>
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
              We&apos;re confirming your payment. Check your email shortly for your tickets.
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
