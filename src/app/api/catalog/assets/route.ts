import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq, ne } from "drizzle-orm";
import { db } from "@/server/db/client";
import { assets, visualConcepts } from "@/server/db/schema";
import {
  getConceptCatalog,
  recordVisualGap,
} from "@/server/services/catalog";
import { storage } from "@/server/services/storage";
import {
  buildIndex,
  search,
  type ConceptRecord,
} from "@/shared/lib/grounding/visual-retrieval";

function isPlaceholderStorageKey(storageKey: string | null | undefined, source?: string | null): boolean {
  if (source === "system-placeholder") return true;
  if (!storageKey) return false;
  return /^placeholder-.*\.webp$/i.test(path.basename(storageKey.split("?")[0] || ""));
}

function resolveStorageUrl(storageKey: string): string {
  if (storageKey.startsWith("http")) {
    return storageKey;
  }
  if (storageKey.startsWith("/media/custom/") || storageKey.startsWith("/media/pictograms/")) {
    const localDiskPath = path.join(process.cwd(), "public", storageKey.replace(/^\/+/, ""));
    if (fs.existsSync(localDiskPath)) {
      return storageKey;
    }
    const supabaseUrl = (
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      (process.env.STORAGE_DRIVER === "supabase" || Boolean(process.env.VERCEL)
        ? "https://vmailnuloaoonmqeguok.supabase.co"
        : "")
    ).replace(/\/+$/, "");
    if (supabaseUrl) {
      return `${supabaseUrl}/storage/v1/object/public/card-images/${encodeURIComponent(path.basename(storageKey))}`;
    }
    return storageKey;
  }
  return storageKey.startsWith("/")
    ? storageKey
    : storage.url(storageKey, "card-images");
}

export interface CatalogAssetItem {
  id: string;
  label: string;
  alt_text: string;
  url: string;
  domains: string[];
  group: string | null;
  source: string;
  assetId: string | null;
}

async function loadMergedActiveConcepts(): Promise<
  Array<{ concept: ConceptRecord; url: string }>
> {
  const diskConcepts = getConceptCatalog();
  const byId = new Map<string, { concept: ConceptRecord; url: string }>();

  for (const c of diskConcepts) {
    if (c.status !== "active") continue;
    const url = c.assetUrl || "";
    if (!url) continue;
    byId.set(c.id, { concept: c, url });
  }

  try {
    const dbRows = await db
      .select({
        concept: visualConcepts,
        storageKey: assets.storageKey,
        assetAlt: assets.alt,
        assetSource: assets.source,
      })
      .from(visualConcepts)
      .leftJoin(assets, eq(visualConcepts.assetId, assets.id))
      .where(ne(visualConcepts.status, "hidden"));

    for (const row of dbRows) {
      const vc = row.concept;
      if (vc.status !== "active") {
        byId.delete(vc.id);
        continue;
      }
      const existing = byId.get(vc.id);
      const validStorageKey =
        row.storageKey && !isPlaceholderStorageKey(row.storageKey, row.assetSource)
          ? row.storageKey
          : null;
      const url = validStorageKey
        ? resolveStorageUrl(validStorageKey)
        : existing?.url ?? "";
      if (!url) continue;

      const isCuratedOnDisk = Boolean(existing) && vc.source !== "upload" && !vc.uploadedBy;
      const mergedConcept: ConceptRecord = isCuratedOnDisk
        ? {
            ...existing!.concept,
            assetId: vc.assetId ?? existing!.concept.assetId,
            assetUrl: url,
          }
        : {
            id: vc.id,
            label: vc.label,
            labelNorm: vc.labelNorm,
            synonyms: vc.synonyms ?? [],
            labelEn: vc.labelEn,
            domains: vc.domains ?? [],
            groupId: vc.groupId,
            kind: vc.kind,
            popularity: vc.popularity,
            assetId: vc.assetId,
            assetUrl: url,
            altAssetIds: vc.altAssetIds ?? [],
            altText: vc.altText ?? row.assetAlt ?? vc.label,
            status: vc.status,
            source: vc.source,
            sourceRef: vc.sourceRef,
          };
      byId.set(vc.id, { concept: mergedConcept, url });
    }
  } catch (err) {
    console.warn("[catalog/assets] DB merge skipped:", err);
  }

  return Array.from(byId.values());
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const rawDomain = (searchParams.get("domain") || "").trim();
    const domainFilter =
      rawDomain && rawDomain.toLowerCase() !== "semua" && rawDomain.toLowerCase() !== "all"
        ? rawDomain
        : undefined;
    const rawGroup = (searchParams.get("group") || "").trim();
    const groupFilter = rawGroup || undefined;

    const rawCursor = Number.parseInt(searchParams.get("cursor") || "0", 10);
    const offset = Number.isFinite(rawCursor) && rawCursor >= 0 ? rawCursor : 0;

    const rawLimit = Number.parseInt(searchParams.get("limit") || "60", 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(100, rawLimit))
      : 60;

    const entries = await loadMergedActiveConcepts();

    // Collect all available domains across active concepts with images
    const domainSet = new Set<string>();
    for (const { concept } of entries) {
      for (const d of concept.domains ?? []) {
        if (d) domainSet.add(d);
      }
    }
    const domains = Array.from(domainSet).sort((a, b) => a.localeCompare(b, "id"));

    let matchedEntries: Array<{ concept: ConceptRecord; url: string }>;

    if (q) {
      const allConcepts = entries.map((e) => e.concept);
      const index = buildIndex(allConcepts);
      const urlById = new Map(entries.map((e) => [e.concept.id, e.url]));
      const hits = search(q, index, {
        domain: domainFilter,
        group: groupFilter,
        limit: allConcepts.length || 1,
        minScore: 1,
        requireImage: true,
      });
      matchedEntries = hits.map((hit) => ({
        concept: hit.concept,
        url: urlById.get(hit.concept.id) || hit.concept.assetUrl || "",
      }));
    } else {
      matchedEntries = entries
        .filter(({ concept }) => {
          if (domainFilter && !(concept.domains ?? []).includes(domainFilter)) {
            return false;
          }
          if (groupFilter && concept.groupId !== groupFilter) {
            return false;
          }
          return true;
        })
        .sort((a, b) => a.concept.label.localeCompare(b.concept.label, "id"));
    }

    const total = matchedEntries.length;
    const page = matchedEntries.slice(offset, offset + limit);
    const nextCursor =
      offset + page.length < total ? String(offset + page.length) : null;

    const items: CatalogAssetItem[] = page.map(({ concept, url }) => ({
      id: concept.id,
      label: concept.label,
      alt_text: concept.altText || concept.label,
      url,
      domains: concept.domains ?? [],
      group: concept.groupId ?? null,
      source: concept.source || "arasaac",
      assetId: concept.assetId ?? null,
    }));

    return NextResponse.json(
      {
        success: true,
        items,
        nextCursor,
        total,
        domains,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[GET /api/catalog/assets] error:", error);
    return NextResponse.json(
      { error: "Gagal memuat daftar aset visual." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      term?: unknown;
      subject?: unknown;
    } | null;
    const term = typeof body?.term === "string" ? body.term.trim() : "";
    const subject = typeof body?.subject === "string" ? body.subject.trim() : null;

    if (!term) {
      return NextResponse.json(
        { error: "Kata kunci gambar yang dilaporkan tidak boleh kosong." },
        { status: 400 }
      );
    }

    await recordVisualGap(term, subject, null);

    return NextResponse.json({
      success: true,
      message: `Permintaan gambar "${term}" telah dicatat.`,
    });
  } catch (error) {
    console.error("[POST /api/catalog/assets] error:", error);
    return NextResponse.json(
      { error: "Gagal mencatat laporan gambar." },
      { status: 500 }
    );
  }
}
