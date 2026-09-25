"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import { checkInTicket, type CheckInResult } from "./actions";

export default function CheckInScanner({ eventId }: { eventId: string }) {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScannedRef = useRef<{ value: string; time: number } | null>(null);
  const isPendingRef = useRef(isPending);
  isPendingRef.current = isPending;

  const runCheckIn = useCallback(
    (rawToken: string) => {
      startTransition(async () => {
        const res = await checkInTicket(eventId, rawToken);
        setResult(res);
      });
    },
    [eventId]
  );

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code?.data) {
          const now = Date.now();
          const last = lastScannedRef.current;
          const isDuplicate = last && last.value === code.data && now - last.time < 4000;

          if (!isDuplicate && !isPendingRef.current) {
            lastScannedRef.current = { value: code.data, time: now };
            runCheckIn(code.data);
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [runCheckIn]);

  useEffect(() => {
    if (!cameraActive) return;

    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch((err) => {
        setCameraError(
          err?.name === "NotAllowedError"
            ? "Camera permission denied — allow camera access, or paste the code manually below."
            : "Couldn't access the camera — paste the code manually below."
        );
        setCameraActive(false);
      });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [cameraActive, tick]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    runCheckIn(token.trim());
    setToken("");
  }

  return (
    <div className="space-y-4">
      {!cameraActive ? (
        <button
          onClick={() => {
            setCameraError(null);
            setCameraActive(true);
          }}
          className="w-full bg-neutral-100 text-neutral-900 rounded-lg py-3 text-sm font-medium"
        >
          📷 Start camera scanner
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-neutral-800 aspect-square bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-8 border-2 border-white/40 rounded-lg pointer-events-none" />
          </div>
          <button
            onClick={() => setCameraActive(false)}
            className="w-full border border-neutral-800 rounded-lg py-2 text-sm text-neutral-400"
          >
            Stop camera
          </button>
        </div>
      )}

      {cameraError && <p className="text-sm text-red-400">{cameraError}</p>}

      <div className="text-xs text-neutral-600 text-center">or enter manually</div>

      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste scanned ticket code"
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button
          disabled={isPending}
          className="bg-neutral-100 text-neutral-900 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "…" : "Check in"}
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
