"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-neutral-800 rounded-xl p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold">Create organizer account</h1>

        <div className="space-y-1">
          <label className="text-sm text-neutral-400">Full name</label>
          <input
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-neutral-400">Email</label>
          <input
            type="email"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-neutral-400">Password</label>
          <input
            type="password"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-neutral-100 text-neutral-900 rounded-lg py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>

        <p className="text-sm text-neutral-500 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-neutral-300 underline">
            Log in
          </a>
        </p>
      </form>
    </main>
  );
}
