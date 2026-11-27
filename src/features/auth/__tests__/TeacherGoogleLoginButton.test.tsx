import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeacherGoogleLoginButton } from "../components/TeacherGoogleLoginButton";

describe("TeacherGoogleLoginButton", () => {
  it("tidak menampilkan pesan galat saat errorCode kosong", () => {
    const { rerender } = render(<TeacherGoogleLoginButton />);
    expect(screen.queryByRole("alert")).toBeNull();

    rerender(<TeacherGoogleLoginButton errorCode="   " />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each([
    ["google_not_configured", "GOOGLE_CLIENT_ID"],
    ["google_cancelled", "Login Google dibatalkan"],
    ["access_denied", "Akses login Google ditolak"],
    ["google_invalid_state", "tidak valid atau kedaluwarsa"],
    ["google_token_failed", "Authorized redirect URI"],
    ["google_userinfo_failed", "Gagal mengambil profil akun"],
    ["google_email_unverified", "belum terverifikasi"],
    ["google_session_failed", "Gagal membuat sesi guru"],
    ["session_expired", "Sesi guru telah berakhir"],
    ["unauthorized", "belum masuk sebagai guru"],
    ["unknown_code", "Gagal masuk dengan akun Google"],
  ])("menampilkan pesan galat jelas untuk errorCode=%s", (code, expected) => {
    render(<TeacherGoogleLoginButton errorCode={code} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain(expected);
  });
});
