"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Button, Card, StatusMessage } from "@/shared/ui";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function exchangeAccessToken(accessToken: string) {
      const response = await fetch("/api/auth/google-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Gagal memverifikasi sesi Google di server.");
      }

      if (active) {
        router.replace("/guru");
        router.refresh();
      }
    }

    async function completeAuth() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        if (active) {
          setError(
            "Konfigurasi Supabase belum lengkap (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
          );
        }
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const oauthError =
        searchParams.get("error_description") ||
        searchParams.get("error") ||
        hashParams.get("error_description") ||
        hashParams.get("error");

      if (oauthError) {
        if (active) {
          setError(oauthError);
        }
        return;
      }

      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (data.session?.access_token) {
          await exchangeAccessToken(data.session.access_token);
          return;
        }

        // Wait briefly for PKCE code exchange or hash parsing to finish if still in flight
        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!active || !session?.access_token) return;
          subscription?.unsubscribe();
          if (timeoutId) clearTimeout(timeoutId);
          try {
            await exchangeAccessToken(session.access_token);
          } catch (err) {
            if (active) {
              setError(
                err instanceof Error ? err.message : "Gagal menyelesaikan login Google."
              );
            }
          }
        });
        subscription = listener.subscription;

        timeoutId = setTimeout(() => {
          if (active) {
            subscription?.unsubscribe();
            setError("Sesi login Google tidak ditemukan atau sudah kedaluwarsa.");
          }
        }, 8000);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Gagal menyelesaikan login Google."
          );
        }
      }
    }

    void completeAuth();

    return () => {
      active = false;
      subscription?.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[var(--bg)] px-4 py-8 text-[var(--ink)]">
      <Card as="section" className="w-full max-w-sm flex flex-col gap-5">
        {error ? (
          <>
            <StatusMessage type="galat" title="Gagal masuk dengan Google">
              {error}
            </StatusMessage>
            <Button href="/guru/masuk" variant="primary" size="large" className="w-full">
              Kembali ke halaman masuk
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <svg
              className="animate-spin text-[var(--primary)]"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeOpacity="0.25"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <h1 className="text-lg font-bold text-[var(--ink)]">Memproses Login Google</h1>
            <p className="text-sm text-[var(--ink-2)]">
              Sebentar ya, kami sedang menyiapkan Ruang Guru Anda...
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
