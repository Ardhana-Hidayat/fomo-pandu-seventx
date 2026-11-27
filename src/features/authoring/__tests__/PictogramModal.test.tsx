import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PictogramModal } from "../components/PictogramModal";
import { ImageUploader } from "../components/ImageUploader";

describe("PictogramModal (Pustaka Gambar + Direct Upload)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:preview-local");
    URL.revokeObjectURL = vi.fn();
  });

  it("renders library thumbnails with real <img>, domains, pagination, and selects resolved item", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/catalog/assets") && url.includes("cursor=1")) {
        return new Response(
          JSON.stringify({
            success: true,
            items: [
              {
                id: "picto:kapal",
                assetId: null,
                url: "/media/pictograms/kapal.webp",
                label: "Kapal",
                alt_text: "Piktogram kapal laut",
                domains: ["transportasi-keselamatan"],
                group: "transportasi",
                source: "arasaac",
              },
            ],
            total: 61,
            domains: ["tumbuhan-makanan", "transportasi-keselamatan"],
            nextCursor: null,
          }),
          { status: 200 }
        );
      }
      if (url.includes("/api/catalog/assets")) {
        return new Response(
          JSON.stringify({
            success: true,
            items: [
              {
                id: "custom:akar-tumbuhan",
                assetId: null,
                url: "/media/custom/akar-tumbuhan.webp",
                label: "Akar Tumbuhan",
                alt_text: "Ilustrasi akar tumbuhan",
                domains: ["tumbuhan-makanan"],
                group: "tumbuhan",
                source: "custom",
              },
            ],
            total: 61,
            domains: ["tumbuhan-makanan", "transportasi-keselamatan"],
            nextCursor: "1",
          }),
          { status: 200 }
        );
      }
      if (url.includes("resolve=custom%3Aakar-tumbuhan")) {
        return new Response(
          JSON.stringify({
            success: true,
            pictogram: {
              id: "uuid-akar-123",
              url: "/media/custom/akar-tumbuhan.webp",
              alt: "Akar Tumbuhan",
            },
          }),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <PictogramModal isOpen={true} onClose={onClose} onSelect={onSelect} />
    );

    const img = await screen.findByAltText("Ilustrasi akar tumbuhan");
    expect(img.getAttribute("src")).toBe("/media/custom/akar-tumbuhan.webp");
    expect(screen.getByText("61 gambar")).toBeTruthy();

    // Pagination button loads more items
    const loadMoreBtn = await screen.findByRole("button", {
      name: /Muat lagi/i,
    });
    fireEvent.click(loadMoreBtn);
    const kapalImg = await screen.findByAltText("Piktogram kapal laut");
    expect(kapalImg.getAttribute("src")).toBe("/media/pictograms/kapal.webp");

    // Select first item and confirm
    fireEvent.click(screen.getByRole("button", { name: /Akar Tumbuhan/i }));
    fireEvent.click(screen.getByRole("button", { name: /Pilih Gambar/i }));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith({
        imageAssetId: "uuid-akar-123",
        imageUrl: "/media/custom/akar-tumbuhan.webp",
        imageAlt: "Ilustrasi akar tumbuhan",
        imageSource: "pictogram",
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("uploads a new image directly in Tab 2 and invokes onSelect with imageAssetId", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/catalog/assets")) {
          return new Response(
            JSON.stringify({
              success: true,
              items: [],
              total: 0,
              domains: [],
              nextCursor: null,
            }),
            { status: 200 }
          );
        }
        if (url === "/api/media/upload") {
          return new Response(
            JSON.stringify({
              success: true,
              duplicate: false,
              url: "/api/media/card-images/upload-kapal.webp",
              asset: {
                id: "asset-uuid-999",
                url: "/api/media/card-images/upload-kapal.webp",
                alt: "Kapal Nelayan Biru",
              },
            }),
            { status: 200 }
          );
        }
        return new Response("{}", { status: 404 });
      })
    );

    const onSelect = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <PictogramModal isOpen={true} onClose={onClose} onSelect={onSelect} />
    );

    fireEvent.click(screen.getByRole("tab", { name: /^Unggah$/i }));

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], "kapal.png", {
      type: "image/png",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.change(screen.getByLabelText(/Nama gambar/i), {
      target: { value: "Kapal Nelayan" },
    });
    fireEvent.change(screen.getByLabelText(/Teks Alternatif \/ Deskripsi/i), {
      target: { value: "Kapal Nelayan Biru" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Unggah & Pasang ke Kartu/i })
    );

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith({
        imageAssetId: "asset-uuid-999",
        imageUrl: "/api/media/card-images/upload-kapal.webp",
        imageAlt: "Kapal Nelayan Biru",
        imageSource: "upload",
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("shows explicit error in ImageUploader instead of silent blob fallback when upload fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: "Sesi guru tidak valid." }),
          { status: 401 }
        )
      )
    );

    const onUploadComplete = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <ImageUploader
        isOpen={true}
        onClose={onClose}
        onUploadComplete={onUploadComplete}
      />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([new Uint8Array([1, 2, 3])], "foto.png", {
      type: "image/png",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.change(screen.getByLabelText(/Teks Alternatif/i), {
      target: { value: "Foto siswa belajar" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Simpan Gambar/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Sesi guru tidak valid.");
    expect(onUploadComplete).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
