"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());
  const [ready, setReady] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function establishSession() {
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(
            "This reset link is invalid or has expired. Please request a new one.",
          );
          setReady(true);
          return;
        }
      }
      const { data } = await supabase.auth.getUser();
      setSessionValid(!!data.user);
      if (!data.user) {
        setError(
          "This reset link is invalid or has expired. Please request a new one.",
        );
      }
      setReady(true);
    }
    establishSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    if (updateError) {
      setError(updateError.message);
    } else {
      await supabase.auth.signOut();
      setSuccess(true);
    }
    setSubmitting(false);
  }

  if (!ready) return <LoadingSpinner />;

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Reset password
      </h1>

      {success ? (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">
            Password updated! Please log in with your new password.
          </div>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
          >
            Go to home
          </button>
        </div>
      ) : sessionValid ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              minLength={6}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? "Please wait…" : "Update password"}
          </button>
        </form>
      ) : (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
          {error}
        </div>
      )}
    </div>
  );
}
