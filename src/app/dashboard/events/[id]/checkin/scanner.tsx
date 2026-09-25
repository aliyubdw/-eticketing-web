"use client";

import { useState, useTransition } from "react";
import { checkInTicket, type CheckInResult } from "./actions";

export default function CheckInScanner({ eventId }: { eventId: string }) {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    startTransition(async () => {
      const res = await checkInTicket(eventId, token.trim());
      setResult(res);
      setToken("");
    });
  }

  return (
    <div className="space-y-4">
      <div className="border border-neutral-800 rounded-xl p-4 text-sm text-neutral-500">
        Camera scanning isn&apos;t wired up yet — for now, scan the QR with any phone camera
        app (or a barcode scanner gun) and paste the decoded text below.
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste scanned ticket code"
          autoFocus
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button
          disabled={isPending}
          className="bg-neutral-100 text-neutral-900 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "Checking…" : "Check in"}
        </button>
      </form>

      {result && (
        <div
          className={`rounded-xl p-4 text-sm font-medium ${
            result.ok
              ? "bg-green-950/60 border border-green-900 text-green-300"
              : "bg-red-950/60 border border-red-900 text-red-300"
          }`}
        >
          {result.ok ? "✅ " : "❌ "}
          {result.message}
        </div>
      )}
    </div>
  );
}
