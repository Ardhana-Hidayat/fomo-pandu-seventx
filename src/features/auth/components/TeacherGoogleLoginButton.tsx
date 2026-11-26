"use client";

import { useState } from "react";
import { Button, StatusMessage } from "@/shared/ui";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured:
    "Login Google belum dikonfigurasi di server. Pastikan GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET sudah diisi di Environment Variables.",
  google_cancelled: "Login Google dibatalkan. Silakan coba lagi.",
  google_invalid_state:
    "Sesi login Google tidak valid atau kedaluwarsa. Silakan coba masuk kembali.",
  google_token_failed:
    "Gagal menukar kode otorisasi dengan Google. Periksa Authorized redirect URI di Google Cloud Console.",
  google_userinfo_failed: "Gagal mengambil profil akun dari Google.",
  google_email_unverified:
    "Email Google Anda belum terverifikasi. Gunakan akun Google yang sudah terverifikasi.",
  google_session_failed: "Gagal membuat sesi guru setelah login Google.",
};

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.37 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

export function TeacherGoogleLoginButton({
  errorCode,
}: {
  errorCode?: string;
}) {
  const [loading, setLoading] = useState(false);

  const errorMessage = errorCode
    ? GOOGLE_ERROR_MESSAGES[errorCode] ?? "Gagal masuk dengan akun Google."
    : null;

  return (
    <div className="flex flex-col gap-3">
      <form
        action="/api/auth/google"
        method="GET"
        onSubmit={() => setLoading(true)}
      >
        <Button
          type="submit"
          variant="secondary"
          size="large"
          loading={loading}
          icon={<GoogleIcon />}
          className="w-full"
        >
          Masuk dengan Google
        </Button>
      </form>

      {errorMessage && (
        <StatusMessage type="galat" title="Login Google tidak berhasil">
          {errorMessage}
        </StatusMessage>
      )}
    </div>
  );
}
