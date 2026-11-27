import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LessonWizard } from "../components/LessonWizard";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

describe("LessonWizard feedback and validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("menambahkan noValidate pada form dan menampilkan pesan galat saat judul kosong", async () => {
    const { container } = render(<LessonWizard />);
    const form = container.querySelector("form");
    expect(form?.hasAttribute("novalidate")).toBe(true);

    fireEvent.click(
      screen.getByRole("button", { name: /Buat Materi & Kuis dengan AI/i })
    );

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBe(2);
    for (const alert of alerts) {
      expect(alert.textContent).toContain("Judul materi wajib diisi.");
    }
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("menampilkan pesan sesi berakhir saat server mengembalikan HTTP 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        text: async () => JSON.stringify({ success: false, error: "Unauthorized" }),
      })
    );

    render(<LessonWizard />);
    fireEvent.change(screen.getByLabelText(/Judul Materi/i), {
      target: { value: "Mengenal Hewan" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Buat Materi & Kuis dengan AI/i })
    );

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBe(2);
    expect(alerts[0]?.textContent).toContain(
      "Sesi guru telah berakhir. Silakan masuk kembali di halaman Masuk Ruang Guru."
    );
  });

  it("menampilkan pesan jelas saat server mengembalikan respons non-JSON 504", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 504,
        ok: false,
        text: async () => "<html>504 Gateway Timeout</html>",
      })
    );

    render(<LessonWizard />);
    fireEvent.change(screen.getByLabelText(/Judul Materi/i), {
      target: { value: "Mengenal Buah" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Buat Materi & Kuis dengan AI/i })
    );

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBe(2);
    expect(alerts[0]?.textContent).toContain(
      "Server mengalami gangguan atau batas waktu habis (HTTP 504). Silakan coba lagi."
    );
  });

  it("tidak memanggil onSuccess sebelum tombol lanjut diklik ketika ada warnings", async () => {
    const onSuccess = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: async () =>
          JSON.stringify({
            success: true,
            data: {
              lessonId: "lesson-123",
              warnings: ["Sebagian gambar memakai fallback."],
            },
          }),
      })
    );

    render(<LessonWizard onSuccess={onSuccess} />);
    fireEvent.change(screen.getByLabelText(/Judul Materi/i), {
      target: { value: "Mengenal Warna" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Buat Materi & Kuis dengan AI/i })
    );

    const continueButtons = await screen.findAllByRole("button", {
      name: /Lanjut ke Editor Materi/i,
    });
    expect(continueButtons.length).toBe(2);
    expect(onSuccess).not.toHaveBeenCalled();

    fireEvent.click(continueButtons[0]!);
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/guru/materi/lesson-123/edit");
    });
  });

  it("menampilkan galat pada mode Upload PDF jika file belum dipilih", async () => {
    const { container } = render(<LessonWizard />);
    fireEvent.click(screen.getByRole("radio", { name: /Upload PDF/i }));

    const form = container.querySelector("form");
    expect(form?.hasAttribute("novalidate")).toBe(true);

    fireEvent.click(
      screen.getByRole("button", { name: /Proses PDF & Buat Materi/i })
    );

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBe(2);
    expect(alerts[0]?.textContent).toContain("Pilih file PDF terlebih dahulu.");
  });
});
