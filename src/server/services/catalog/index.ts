import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { visualGaps } from "@/server/db/schema";
import {
  buildIndex,
  normalize,
  type ConceptIndex,
  type ConceptRecord,
} from "@/shared/lib/grounding/visual-retrieval";
import { loadCatalogFromDisk } from "./loader";

const globalForCatalog = globalThis as unknown as {
  __conceptCatalog?: ConceptRecord[];
  __conceptIndex?: ConceptIndex;
};

/**
 * Return cached active/all concepts from data/catalog/*.json.
 */
export function getConceptCatalog(forceReload = false): ConceptRecord[] {
  if (!globalForCatalog.__conceptCatalog || forceReload) {
    globalForCatalog.__conceptCatalog = loadCatalogFromDisk();
    globalForCatalog.__conceptIndex = undefined;
  }
  return globalForCatalog.__conceptCatalog;
}

/**
 * Return cached inverted ConceptIndex built from getConceptCatalog().
 */
export function getConceptIndex(forceReload = false): ConceptIndex {
  if (forceReload || !globalForCatalog.__conceptIndex) {
    const catalog = getConceptCatalog(forceReload);
    globalForCatalog.__conceptIndex = buildIndex(catalog);
  }
  return globalForCatalog.__conceptIndex;
}

/**
 * Invalidate in-memory catalog and index caches (e.g. after teacher upload).
 */
export function invalidateConceptCatalog(): void {
  globalForCatalog.__conceptCatalog = undefined;
  globalForCatalog.__conceptIndex = undefined;
}

/**
 * Record an unmapped visual term into visual_gaps for catalog expansion tracking.
 */
export async function recordVisualGap(
  term: string,
  subject?: string | null,
  lessonId?: string | null
): Promise<void> {
  const norm = normalize(term);
  if (!norm) return;

  try {
    const now = new Date();
    await db
      .insert(visualGaps)
      .values({
        term: norm,
        count: 1,
        subject: subject ?? null,
        lastLessonId: lessonId ?? null,
        firstSeen: now,
        lastSeen: now,
        status: "open",
      })
      .onConflictDoUpdate({
        target: visualGaps.term,
        set: {
          count: sql`${visualGaps.count} + 1`,
          lastSeen: now,
          ...(subject ? { subject } : {}),
          ...(lessonId ? { lastLessonId: lessonId } : {}),
        },
      });
  } catch (err) {
    console.warn("[catalog] Failed to record visual gap:", err);
  }
}
