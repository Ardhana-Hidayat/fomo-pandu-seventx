import {
  wordIndexAt,
  progressInWord,
  slotAt,
  completedSignWord,
  scaleTimeline,
  buildSignSchedule,
  type SignSlot,
  type Timeline,
} from "./index";
import {
  extractUniqueSignLetters,
  type PaceConfig,
  type PlaybackSegment,
} from "./playback-plan";

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

export interface AudioTimelineCallbacks extends SegmentedPlaybackCallbacks {
  onStarted: () => void;
  onFallbackToTTS: () => void;
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
  // Simpan referensi utterance aktif agar tidak di-GC browser sebelum `onend`
  let activeUtterance: SpeechSynthesisUtterance | null = null;

  const clearActiveUtterance = () => {
    if (activeUtterance) {
      activeUtterance.onend = null;
      activeUtterance.onerror = null;
      activeUtterance = null;
    }
  };

  const stepSegment = (segIndex: number) => {
    if (!cb.isActive()) {
      clearActiveUtterance();
      return;
    }

    if (segIndex >= plan.length) {
      clearActiveUtterance();
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

    const speakSegment = () => {
      if (!cb.isActive()) return;
      try {
        clearActiveUtterance();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        const utt = new SpeechSynthesisUtterance(seg.speechText);
        utt.lang = "id-ID";
        utt.rate = speechRate;
        utt.onend = () => {
          speechDone = true;
          if (activeUtterance === utt) activeUtterance = null;
        };
        utt.onerror = () => {
          speechDone = true;
          if (activeUtterance === utt) activeUtterance = null;
        };
        activeUtterance = utt;
        window.speechSynthesis.speak(utt);
      } catch {
        clearActiveUtterance();
        speechDone = true;
      }
    };

    if (hasSpeech) {
      try {
        clearActiveUtterance();
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
          // Jeda singkat mencegah bug Chromium/Safari saat cancel() & speak() dipanggil serentak
          cb.setTimer(setTimeout(speakSegment, 20));
        } else {
          speakSegment();
        }
      } catch {
        speechDone = true;
      }
    } else {
      speechDone = true;
    }

    // Batas pengaman jika speechSynthesis browser tidak memicu onend
    const safetyTimeoutMs = seg.minDurationMs + 2200;

    const tick = () => {
      if (!cb.isActive()) {
        clearActiveUtterance();
        return;
      }

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

/**
 * Jalankan pemutaran berkas audio tunggal yang diselaraskan dengan garis waktu kata & ejaan SIBI.
 * Seluruh callback dilindungi oleh `cb.isActive()` agar tidak bocor saat pindah kartu atau jeda.
 */
export function runAudioTimelinePlayback(
  audio: HTMLAudioElement,
  audioSrc: string,
  speechTimeline: Timeline,
  signBaseTimeline: Timeline,
  paceConfig: PaceConfig,
  cb: AudioTimelineCallbacks
): void {
  audio.onloadedmetadata = null;
  audio.onended = null;
  audio.onerror = null;

  const startWithMetadata = () => {
    if (!cb.isActive()) return;
    audio.onloadedmetadata = null;

    const rawDuration = audio.duration;
    const durMs =
      Number.isFinite(rawDuration) && rawDuration > 0
        ? rawDuration * 1000
        : Math.max(speechTimeline.total, 2500);
    const scaledSpeech = scaleTimeline(speechTimeline, durMs);
    const schedule = buildSignSchedule(signBaseTimeline, paceConfig.letterMs);

    let freeClockStart: { startPerf: number; startAudioMs: number } | null = null;

    const updateSyncAt = (tMs: number) => {
      const totalWords = scaledSpeech.words.length;
      if (totalWords === 0) return;

      const slot = slotAt(schedule.slots, tMs);
      const doneWord = completedSignWord(schedule.slots, tMs);
      const audioFinished = freeClockStart !== null || tMs >= scaledSpeech.total;

      let wIdx: number;
      let prog: number;

      if (audioFinished && slot) {
        wIdx = slot.wordIndex;
        const wordSlots = schedule.slots.filter((s) => s.wordIndex === slot.wordIndex);
        const firstStart = wordSlots[0]?.start ?? slot.start;
        const lastEnd = wordSlots[wordSlots.length - 1]?.end ?? slot.end;
        prog = Math.min(1, Math.max(0, (tMs - firstStart) / Math.max(1, lastEnd - firstStart)));
      } else {
        wIdx = wordIndexAt(scaledSpeech, tMs);
        prog = progressInWord(scaledSpeech, tMs);
        if (tMs >= scaledSpeech.total && !slot) {
          wIdx = totalWords;
          prog = 1;
        }
      }

      cb.onSync({
        activeWordIdx: wIdx,
        activeWordProgress: prog,
        activeSignSlot: slot,
        activeSegmentWordIdx: slot ? slot.wordIndex : null,
        completedWordIndex: doneWord,
      });
    };

    const loop = () => {
      if (!cb.isActive()) return;

      let currentTimeMs = 0;
      if (!audio.paused && !audio.ended && !freeClockStart) {
        currentTimeMs = audio.currentTime * 1000;
      } else if (freeClockStart) {
        const elapsed = performance.now() - freeClockStart.startPerf;
        currentTimeMs = freeClockStart.startAudioMs + elapsed * paceConfig.speechRate;
      } else {
        return;
      }

      updateSyncAt(currentTimeMs);

      const endThreshold = Math.max(scaledSpeech.total, schedule.signEnd);
      if (currentTimeMs >= endThreshold) {
        cb.onSync({
          activeWordIdx: scaledSpeech.words.length,
          activeWordProgress: 1,
          activeSignSlot: null,
          activeSegmentWordIdx: null,
          completedWordIndex: null,
        });
        cb.setTimer(
          setTimeout(() => {
            if (cb.isActive()) cb.onComplete();
          }, 300)
        );
        return;
      }

      cb.setFrame(requestAnimationFrame(loop));
    };

    audio.onended = () => {
      if (!cb.isActive()) return;
      const currentMs = Math.max(audio.currentTime * 1000, scaledSpeech.total);
      if (currentMs < schedule.signEnd) {
        cb.setFrame(null);
        freeClockStart = {
          startPerf: performance.now(),
          startAudioMs: currentMs,
        };
        cb.setFrame(requestAnimationFrame(loop));
      } else {
        cb.onSync({
          activeWordIdx: scaledSpeech.words.length,
          activeWordProgress: 1,
          activeSignSlot: null,
          activeSegmentWordIdx: null,
          completedWordIndex: null,
        });
        cb.setTimer(
          setTimeout(() => {
            if (cb.isActive()) cb.onComplete();
          }, 300)
        );
      }
    };

    audio
      .play()
      .then(() => {
        if (!cb.isActive()) {
          audio.pause();
          return;
        }
        cb.onStarted();
        cb.setFrame(requestAnimationFrame(loop));
      })
      .catch(() => {
        if (cb.isActive()) cb.onFallbackToTTS();
      });
  };

  audio.onerror = () => {
    if (cb.isActive()) cb.onFallbackToTTS();
  };

  audio.src = audioSrc;
  audio.playbackRate = paceConfig.speechRate;
  if (audio.readyState >= 1) {
    startWithMetadata();
  } else {
    audio.onloadedmetadata = startWithMetadata;
    audio.load();
  }
}
