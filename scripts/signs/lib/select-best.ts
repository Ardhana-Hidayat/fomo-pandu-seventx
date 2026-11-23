/**
 * Pure function to select the best sign candidate per letter according to Pack 2 Berkas 03 §2.
 * Priority order: P1 > P2 > P3.
 * Within same priority, prefer consistent participant/session and higher score.
 */

export interface CandidateItem {
  letter: string;
  sourceId: string;
  priority: "P1" | "P2" | "P3";
  file: string;
  score: number;
  participantId?: string;
  rejected?: boolean;
  rejectReason?: string;
  flags?: string[];
}

export interface SelectionResult {
  letter: string;
  sourceId?: string;
  file?: string;
  score?: number;
  alternates: string[];
  flags: string[];
  missing: boolean;
}

const PRIORITY_ORDER: Record<string, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
};

export function selectBestCandidate(
  letter: string,
  candidates: CandidateItem[],
  preferredParticipantId?: string
): SelectionResult {
  const valid = candidates.filter((c) => !c.rejected && c.score > 0);

  if (valid.length === 0) {
    return {
      letter,
      alternates: [],
      flags: [],
      missing: true,
    };
  }

  // Sort candidates
  valid.sort((a, b) => {
    const prioA = PRIORITY_ORDER[a.priority] ?? 99;
    const prioB = PRIORITY_ORDER[b.priority] ?? 99;
    if (prioA !== prioB) return prioA - prioB;

    if (preferredParticipantId) {
      const matchA = a.participantId === preferredParticipantId ? 1 : 0;
      const matchB = b.participantId === preferredParticipantId ? 1 : 0;
      if (matchA !== matchB) return matchB - matchA;
    }

    return b.score - a.score;
  });

  const best = valid[0]!;
  const alternates = valid.slice(1, 4).map((c) => c.file);
  const flags = [...(best.flags ?? [])];
  if (letter === "J" || letter === "Z") {
    if (!flags.includes("motion")) flags.push("motion");
  }

  return {
    letter,
    sourceId: best.sourceId,
    file: best.file,
    score: best.score,
    alternates,
    flags,
    missing: false,
  };
}
