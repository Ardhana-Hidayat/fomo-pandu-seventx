import {
  wordIndexAt,
  progressInWord,
  slotAt,
  completedSignWord,
  type SignSlot,
} from "./index";
import { extractUniqueSignLetters, type PlaybackSegment } from "./playback-plan";

export interface SegmentedSyncState {
  activeWordIdx: number;
  activeWordProgress: number;
  activeSignSlot: SignSlot | null;
  activeSegmentWordIdx: number | null;
  completedWordIndex: number | null;
}

export interface SegmentedPlaybackCallbacks {
  onSync: (state: SegmentedSyncState) => void;
  onComplete: () => void;
  isActive: () => boolean;
  setFrame: (id: number | null) => void;
  setTimer: (id: ReturnType<typeof setTimeout> | null) => void;
}

/**
 * Preload hanya huruf unik SIBI yang muncul pada kalimat/kartu aktif.
 * Mengembalikan fungsi cleanup untuk melepas referensi gambar.
 */
export function preloadSignImagesForWords(words: string[]): () => void {
  if (typeof window === "undefined" || typeof window.Image === "undefined") {
    return () => {};
  }
  const letters = extractUniqueSignLetters(words);
  const preloaded: HTMLImageElement[] = letters.map((ch) => {
    const img = new window.Image();
    img.decoding = "async";
    img.src = `/signs/sibi/${ch}.webp`;
    return img;
  });
  return () => {
    preloaded.length = 0;
  };
}

/**
 * Jalankan pemutaran tersegmentasi (TTS + sorotan kata + ejaan huruf SIBI).
 * Menjamin huruf terakhir tiap kata tampil penuh selama `letterMs` sebelum lanjut ke segmen berikutnya.
 */
export function runSegmentedPlayback(
  plan: PlaybackSegment[],
  totalTokens: number,
  speechRate: number,
  cb: SegmentedPlaybackCallbacks
): void {
  const stepSegment = (segIndex: number) => {
    if (!cb.isActive()) return;

    if (segIndex >= plan.length) {
      cb.onSync({
        activeWordIdx: totalTokens,
        activeWordProgress: 1,
        activeSignSlot: null,
        activeSegmentWordIdx: null,
        completedWordIndex: null,
      });
      cb.setTimer(
        setTimeout(() => {
          if (cb.isActive()) {
            cb.onComplete();
          }
        }, 400)
      );
      return;
    }

    const seg = plan[segIndex]!;
    let segStartPerf: number | null = null;
    let lastSlotShownAt: number | null = null;
    let speechDone = false;

    const lastSlot =
      seg.schedule.slots.length > 0
        ? seg.schedule.slots[seg.schedule.slots.length - 1]!
        : null;
    const lastSlotDwellMs = lastSlot
      ? Math.max(seg.letterMs, lastSlot.end - lastSlot.start)
      : 0;

    const hasSpeech =
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      seg.speechText.trim().length > 0;

    if (hasSpeech) {
      try {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(seg.speechText);
        utt.lang = "id-ID";
        utt.rate = speechRate;
        utt.onend = () => {
          speechDone = true;
        };
        utt.onerror = () => {
          speechDone = true;
        };
        window.speechSynthesis.speak(utt);
      } catch {
        speechDone = true;
      }
    } else {
      speechDone = true;
    }

    // Batas pengaman jika speechSynthesis browser tidak memicu onend
    const safetyTimeoutMs = seg.minDurationMs + 2200;

    const tick = () => {
      if (!cb.isActive()) return;

      const now = performance.now();
      if (segStartPerf === null) {
        segStartPerf = now;
      }
      const elapsed = now - segStartPerf;
      if (elapsed >= safetyTimeoutMs) {
        speechDone = true;
      }

      if (seg.isKey) {
        const prog = Math.min(
          1,
          Math.max(0, elapsed / Math.max(1, seg.minDurationMs))
        );
        let slot = slotAt(seg.schedule.slots, elapsed);
        let doneLocal = completedSignWord(seg.schedule.slots, elapsed);

        if (lastSlot) {
          if (slot && slot.letterIndex === lastSlot.letterIndex) {
            if (lastSlotShownAt === null) {
              lastSlotShownAt = now;
            }
          } else if (slot === null && elapsed >= lastSlot.start) {
            if (lastSlotShownAt === null) {
              lastSlotShownAt = now;
            }
            if (now - lastSlotShownAt < lastSlotDwellMs) {
              slot = lastSlot;
              doneLocal = null;
            }
          }
        }

        const lastSlotDone =
          !lastSlot ||
          (lastSlotShownAt !== null && now - lastSlotShownAt >= lastSlotDwellMs);

        cb.onSync({
          activeWordIdx: seg.startTokenIdx,
          activeWordProgress: prog,
          activeSegmentWordIdx: seg.startTokenIdx,
          activeSignSlot: slot ?? (doneLocal !== null ? lastSlot : null),
          completedWordIndex:
            doneLocal !== null && lastSlotDone ? seg.startTokenIdx : null,
        });

        if (elapsed >= seg.minDurationMs && lastSlotDone && speechDone) {
          cb.setTimer(
            setTimeout(() => {
              stepSegment(segIndex + 1);
            }, 140)
          );
          return;
        }
      } else {
        const clampedElapsed = Math.min(elapsed, seg.timeline.total);
        const localWIdx = Math.max(
          0,
          Math.min(
            seg.tokens.length - 1,
            wordIndexAt(seg.timeline, clampedElapsed)
          )
        );
        const prog =
          elapsed >= seg.timeline.total
            ? 1
            : progressInWord(seg.timeline, clampedElapsed);

        cb.onSync({
          activeWordIdx: seg.startTokenIdx + localWIdx,
          activeWordProgress: prog,
          activeSegmentWordIdx: null,
          activeSignSlot: null,
          completedWordIndex: null,
        });

        if (elapsed >= seg.minDurationMs && speechDone) {
          cb.setTimer(
            setTimeout(() => {
              stepSegment(segIndex + 1);
            }, 140)
          );
          return;
        }
      }

      cb.setFrame(requestAnimationFrame(tick));
    };

    cb.setFrame(requestAnimationFrame(tick));
  };

  stepSegment(0);
}
