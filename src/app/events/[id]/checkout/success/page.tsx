"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

type Ticket = {
  ticket_id: string;
  ticket_code: string | null;
  ticket_type_name: string;
  status: string;
  qr_token: string;
};

export default function CheckoutSuccessPage() {
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "error">("checking");
  const [tickets, setTickets] = useState<Array<Omit<Ticket, "qr_token"> & { qr_dataurl: string }>>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadTickets() {
      const params = new URLSearchParams(window.location.search);
      const orderId = params.get("order");
      const accessToken = new URLSearchParams(window.location.hash.slice(1)).get("access_token");

      if (!orderId || !accessToken) {
        setStatus("error");
        setMessage("This ticket link is incomplete. Please use the ticket link from your payment.");
        return;
      }

      let paid = false;
      for (let i = 0; i < 10; i++) {
        try {
          const response = await fetch("/api/orders/" + encodeURIComponent(orderId) + "/status", { cache: "no-store" });
          if (response.ok) {
            const data = await response.json();
            if (data.status === "paid") {
              paid = true;
              break;
            }
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (cancelled) return;

      if (!paid) {
        setStatus("pending");
        setMessage("Your payment is still being confirmed. Refresh this page in a moment.");
        return;
      }

      const revealResponse = await fetch("/api/tickets/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ access_token: accessToken }),
      });
      const revealData = await revealResponse.json();

      if (!revealResponse.ok) {
        setStatus("error");
        setMessage(revealData?.error ?? "Could not retrieve your tickets.");
        return;
      }

      const revealed: Ticket[] = revealData.tickets ?? [];
      const rendered = await Promise.all(revealed.map(async (ticket) => ({
        ticket_id: ticket.ticket_id,
        ticket_code: ticket.ticket_code,
        ticket_type_name: ticket.ticket_type_name,
        status: ticket.status,
        qr_dataurl: await QRCode.toDataURL(ticket.qr_token, { margin: 1, width: 220 }),
      })));

      if (!cancelled) {
        setTickets(rendered);
        setStatus("paid");
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    }

    loadTickets();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "paid" ? (
          <>
            <h1 className="text-2xl font-semibold">Payment confirmed 🎉</h1>
            <p className="text-neutral-400">Save these tickets — you&apos;ll need to show the QR code at the door.</p>
            <div className="space-y-4">
              {tickets.map((ticket, i) => (
                <div key={ticket.ticket_id} className="border border-neutral-800 rounded-xl p-5 flex flex-col items-center gap-3">
                  <p className="text-sm text-neutral-400">{ticket.ticket_type_name} · Ticket {i + 1} of {tickets.length}</p>
                  {ticket.ticket_code && <p className="font-mono text-sm text-neutral-200">{ticket.ticket_code}</p>}
                  <img src={ticket.qr_dataurl} alt={"QR code for " + ticket.ticket_type_name + " ticket"} className="rounded-lg bg-white p-2" width={220} height={220} />
                  <p className="text-xs text-neutral-500 capitalize">{ticket.status}</p>
                </div>
              ))}
            </div>
          </>
        ) : status === "pending" ? (
          <>
            <h1 className="text-2xl font-semibold">Confirming your payment…</h1>
            <p className="text-neutral-400">{message}</p>
          </>
        ) : status === "error" ? (
          <>
            <h1 className="text-2xl font-semibold">Ticket retrieval failed</h1>
            <p className="text-neutral-400">{message}</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold">Processing payment…</h1>
            <p className="text-neutral-400">Please wait while we confirm your payment and prepare your tickets.</p>
          </>
        )}
        <Link href="/" className="inline-block text-sm text-neutral-300 underline">Back to events</Link>
      </div>
    </main>
  );
}
