"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Field,
  Icon,
  type IconName,
  StatusMessage,
} from "@/shared/ui";
import { SignCard } from "@/features/player";
import {
  saveCardAction,
  updateLessonAction,
  updatePresentationAction,
} from "../actions";
import type { LessonShareInfo } from "../queries";
import type { LessonWithContent } from "@/server/repos/lessons";
import { ShareLessonButton } from "./ShareLessonOverlay";

const PictogramModal = dynamic(
  () => import("./PictogramModal").then((m) => m.PictogramModal),
  { ssr: false }
);
const ImageUploader = dynamic(
  () => import("./ImageUploader").then((m) => m.ImageUploader),
  { ssr: false }
);
const AudioRecorder = dynamic(
  () => import("./AudioRecorder").then((m) => m.AudioRecorder),
  { ssr: false }
);
const SignVoiceReviewPanel = dynamic(
  () => import("./SignVoiceReviewPanel").then((m) => m.SignVoiceReviewPanel),
  { ssr: false }
);

interface LessonEditorProps {
  lesson: LessonWithContent;
  shares: LessonShareInfo[];
}

type EditorTab = "kartu" | "kuis" | "isyarat_suara";
type CanonicalQuestionType =
  | "choice_word"
  | "pilih_gambar"
  | "choice_sign"
  | "benar_salah"
  | "arrange_steps";

interface NormalizedOption {
  id: string;
  text: string;
  imageUrl?: string;
  correct: boolean;
}

interface NormalizedStep {
  id: string;
  text: string;
  imageUrl?: string;
}

function normalizeQuestionType(rawType: string): CanonicalQuestionType {
  switch (rawType) {
    case "pilih_gambar":
      return "pilih_gambar";
    case "cocokkan_isyarat":
    case "choice_sign":
      return "choice_sign";
    case "benar_salah":
      return "benar_salah";
    case "urutan":
    case "arrange_steps":
      return "arrange_steps";
    case "pilih_kata":
    case "choice_word":
    default:
      return "choice_word";
  }
}

function questionTypeLabel(rawType: string): string {
  switch (normalizeQuestionType(rawType)) {
    case "pilih_gambar":
      return "Pilihan Bergambar";
    case "choice_sign":
      return "Cocokkan Isyarat";
    case "benar_salah":
      return "Benar / Salah";
    case "arrange_steps":
      return "Susun Urutan";
    case "choice_word":
    default:
      return "Pilihan Kata";
  }
}

function extractOptions(
  payload: Record<string, unknown> | null | undefined
): NormalizedOption[] {
  const raw = payload?.options;
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    if (typeof item === "string") {
      const answer = payload?.answer;
      const isCorrect =
        answer !== undefined
          ? String(answer).trim().toLowerCase() === item.trim().toLowerCase()
          : idx === 0;
      return { id: `opt-${idx + 1}`, text: item, correct: isCorrect };
    }
    const obj = item as {
      id?: string;
      text?: string;
      label?: string;
      imageUrl?: string;
      image?: { url?: string };
      correct?: boolean;
    };
    const text = obj.text ?? obj.label ?? `Pilihan ${idx + 1}`;
    return {
      id: obj.id ?? `opt-${idx + 1}`,
      text,
      imageUrl: obj.imageUrl ?? obj.image?.url,
      correct: typeof obj.correct === "boolean" ? obj.correct : idx === 0,
    };
  });
}

function extractSteps(
  payload: Record<string, unknown> | null | undefined
): NormalizedStep[] {
  const raw = payload?.steps;
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    if (typeof item === "string") {
      return { id: `step-${idx + 1}`, text: item };
    }
    const obj = item as {
      id?: string;
      text?: string;
      imageUrl?: string;
      image?: { url?: string };
    };
    return {
      id: obj.id ?? `step-${idx + 1}`,
      text: obj.text ?? `Langkah ${idx + 1}`,
      imageUrl: obj.imageUrl ?? obj.image?.url,
    };
  });
}

function extractSignWord(
  question: LessonWithContent["questions"][number]
): string {
  const p = (question.payload as Record<string, unknown> | undefined) ?? {};
  return String(
    p.signWord ?? p.sign_word ?? question.keyTerms?.[0] ?? ""
  ).trim();
}

const INDONESIAN_STOP_WORDS = new Set([
  "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "pada", "atau",
  "ini", "itu", "adalah", "ada", "akan", "juga", "saya", "kamu", "kita",
  "kami", "mereka", "dia", "ia", "nya", "oleh", "karena", "sebagai",
  "dalam", "tidak", "bukan", "jangan", "agar", "supaya", "saat", "ketika",
  "jika", "kalau", "bila", "sudah", "telah", "sedang", "masih", "bisa",
  "dapat", "harus", "mau", "ingin", "lalu", "kemudian", "serta", "secara",
  "tentang", "seperti", "antara", "setelah", "sebelum", "selama", "hingga",
  "sampai", "si", "sang", "para", "pun", "lah", "kah", "tah", "saja",
  "hanya", "lebih", "sangat", "sekali", "semua", "setiap", "tiap",
  "banyak", "sedikit", "beberapa", "satu", "dua", "tiga", "yuk", "ayo", "mari",
]);

function deriveSibiKeyTerms(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9-]/g, ""))
    .filter((w) => w.length >= 2);

  const unique: string[] = [];
  for (const w of words) {
    if (!INDONESIAN_STOP_WORDS.has(w) && !unique.includes(w)) {
      unique.push(w);
      if (unique.length >= 4) break;
    }
  }

  if (unique.length === 0 && words.length > 0 && words[0]) {
    return [words[0]];
  }
  return unique;
}

function renderCardTextWithKeyTerms(
  text: string,
  keyTerms: string[] | null | undefined
) {
  const normalizedTerms = (keyTerms ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (normalizedTerms.length === 0) {
    return <span>{text}</span>;
  }

  return text.split(/(\s+)/).map((part, idx) => {
    const clean = part.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
    const isKey =
      clean.length > 0 &&
      normalizedTerms.some(
        (term) => term === clean || term.split(/\s+/).includes(clean)
      );
    if (!isKey) return <span key={idx}>{part}</span>;
    return (
      <mark
        key={idx}
        className="rounded px-1 py-0.5 bg-[var(--sorot-lembut)] text-[var(--on-sorot)] font-bold"
      >
        {part}
      </mark>
    );
  });
}

export function LessonEditor({ lesson, shares }: LessonEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EditorTab>("kartu");

  const [title, setTitle] = useState(lesson.title);
  const [topic, setTopic] = useState(lesson.topic);
  const [isEditingMeta, setIsEditingMeta] = useState(false);

  const [cards, setCards] = useState(lesson.cards);
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [newKeyTerm, setNewKeyTerm] = useState("");

  const [questions, setQuestions] = useState(lesson.questions);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [previewSelectedOptionId, setPreviewSelectedOptionId] = useState<
    string | null
  >(null);
  const [previewFeedback, setPreviewFeedback] = useState<
    "benar" | "ulang" | null
  >(null);
  const [previewOrderIds, setPreviewOrderIds] = useState<string[] | null>(null);
  const [previewSelectedStepId, setPreviewSelectedStepId] = useState<
    string | null
  >(null);

  function resetPreview() {
    setPreviewSelectedOptionId(null);
    setPreviewFeedback(null);
    setPreviewOrderIds(null);
    setPreviewSelectedStepId(null);
  }

  // Pengaturan Isyarat & Suara (dikunci ke SIBI)
  const signSystem = "SIBI" as const;
  const [signScope, setSignScope] = useState<"key_terms" | "all">(
    (lesson.signScope as "key_terms" | "all") ?? "key_terms"
  );
  const [signSpeed, setSignSpeed] = useState<number>(lesson.signSpeed ?? 1.0);
  const [voiceKey, setVoiceKey] = useState<string>(lesson.voiceKey ?? "A");
  const [voiceSpeed, setVoiceSpeed] = useState<number>(lesson.voiceSpeed ?? 1.0);

  const [localShare, setLocalShare] = useState<LessonShareInfo | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [syncingCardId, setSyncingCardId] = useState<string | null>(null);
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSyncAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
      autoSyncAbortRef.current?.abort();
    };
  }, []);
  const [feedback, setFeedback] = useState<{
    type: "benar" | "ulang" | "galat" | "info";
    message: string;
  } | null>(null);

  // Modal states for media tools
  const [activeCardIndexForMedia, setActiveCardIndexForMedia] = useState<
    number | null
  >(null);
  const [isPictoModalOpen, setIsPictoModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [playingCardIdx, setPlayingCardIdx] = useState<number | null>(null);

  const safeCardIdx = Math.min(activeCardIdx, Math.max(0, cards.length - 1));
  const activeCard = cards[safeCardIdx];

  const safeQuestionIdx = Math.min(
    activeQuestionIdx,
    Math.max(0, questions.length - 1)
  );
  const activeQuestion = questions[safeQuestionIdx];

  const activeShares = localShare ? [localShare] : shares;
  const primaryShare = activeShares[0] ?? null;
  const primaryShareCode =
    primaryShare?.shareCode ?? lesson.publications?.[0]?.shareCode;
  const isPublished = lesson.status === "published" || Boolean(localShare);
  const tvHref = primaryShare
    ? `/tv/${primaryShare.classroomJoinCode}/${lesson.id}`
    : `/guru/materi/${lesson.id}/presentasi`;

  function handlePlayAudioPreview(idx: number, card: (typeof cards)[number]) {
    if (playingCardIdx === idx) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingCardIdx(null);
      return;
    }

    if (card.audioRef) {
      const audio = new Audio(card.audioRef);
      setPlayingCardIdx(idx);
      audio.onended = () => setPlayingCardIdx(null);
      audio.onerror = () => setPlayingCardIdx(null);
      audio.play().catch(() => setPlayingCardIdx(null));
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(card.text);
      utt.lang = "id-ID";
      utt.rate = voiceSpeed || 0.95;
      setPlayingCardIdx(idx);
      utt.onend = () => setPlayingCardIdx(null);
      utt.onerror = () => setPlayingCardIdx(null);
      window.speechSynthesis.speak(utt);
    }
  }

  async function handleSaveMeta() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFeedback({ type: "ulang", message: "Judul materi tidak boleh kosong." });
      return;
    }
    setIsSaving(true);
    const res = await updateLessonAction(lesson.id, {
      title: cleanTitle,
      topic: topic.trim(),
    });
    setIsSaving(false);
    if (res.ok) {
      setIsEditingMeta(false);
      setFeedback({ type: "benar", message: "Judul dan topik materi disimpan." });
      router.refresh();
    } else {
      setFeedback({ type: "galat", message: res.error.message });
    }
  }

  // Card modifications
  function updateCardText(idx: number, newText: string) {
    const targetCard = cards[idx];
    if (!targetCard) return;
    const cardId = targetCard.id;

    setCards((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, text: newText } : c))
    );

    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
    }
    autoSyncAbortRef.current?.abort();

    const trimmed = newText.trim();
    if (!trimmed) {
      setSyncingCardId(null);
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, keyTerms: [] } : c))
      );
      return;
    }

    autoSyncTimerRef.current = setTimeout(async () => {
      const derivedTerms = deriveSibiKeyTerms(trimmed);
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, keyTerms: derivedTerms } : c
        )
      );

      const primaryKeyword = derivedTerms[0];
      if (!primaryKeyword || targetCard.imageSource === "upload") {
        setSyncingCardId(null);
        return;
      }

      const controller = new AbortController();
      autoSyncAbortRef.current = controller;
      setSyncingCardId(cardId);

      try {
        const res = await fetch(
          `/api/media/pictograms?q=${encodeURIComponent(primaryKeyword)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          pictogram?: { id?: string; url?: string; alt?: string };
        };
        const pic = data?.pictogram;
        if (pic?.url && !controller.signal.aborted) {
          setCards((prev) =>
            prev.map((c) =>
              c.id === cardId
                ? {
                    ...c,
                    imageUrl: pic.url ?? null,
                    imageAssetId: pic.id ?? null,
                    imageAlt: pic.alt || `Piktogram ${primaryKeyword}`,
                    imageSource: "pictogram",
                  }
                : c
            )
          );
        }
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") {
          // Abaikan kegagalan jaringan sementara saat mengetik
        }
      } finally {
        if (!controller.signal.aborted) {
          setSyncingCardId((curr) => (curr === cardId ? null : curr));
        }
      }
    }, 450);
  }

  async function handleSaveCard(idx: number) {
    const card = cards[idx];
    if (!card) return;
    if (!card.text.trim()) {
      setFeedback({ type: "ulang", message: "Teks kalimat kartu tidak boleh kosong." });
      return;
    }

    setIsSavingCard(true);
    const res = await saveCardAction(lesson.id, {
      id: card.id,
      position: card.position,
      text: card.text.trim(),
      keyTerms: card.keyTerms ?? [],
      cardType:
        (card.cardType as "vocabulary" | "instruction" | "step") ?? "instruction",
      imageSource:
        (card.imageSource as "upload" | "pictogram" | "ai") ?? "pictogram",
      imageAlt: card.imageAlt ?? null,
      imageAssetId: card.imageAssetId ?? null,
      audioSource:
        (card.audioSource as "tts" | "recording" | "none") ?? "none",
      audioAssetId: card.audioAssetId ?? null,
    });
    setIsSavingCard(false);

    if (res.ok) {
      setCards((prev) =>
        prev.map((c, i) => (i === idx ? { ...c, id: res.data.id } : c))
      );
      setFeedback({ type: "benar", message: `Kartu #${card.position} berhasil disimpan.` });
      router.refresh();
    } else {
      setFeedback({ type: "galat", message: res.error.message });
    }
  }

  function handleAddKeyTerm(idx: number) {
    const clean = newKeyTerm.trim().toLowerCase();
    if (!clean) return;
    setCards((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const current = c.keyTerms ?? [];
        if (current.some((t) => t.toLowerCase() === clean)) return c;
        return { ...c, keyTerms: [...current, clean] };
      })
    );
    setNewKeyTerm("");
  }

  function handleRemoveKeyTerm(idx: number, termToRemove: string) {
    setCards((prev) =>
      prev.map((c, i) =>
        i === idx
          ? {
              ...c,
              keyTerms: (c.keyTerms ?? []).filter((t) => t !== termToRemove),
            }
          : c
      )
    );
  }

  function handleMoveCard(idx: number, direction: "up" | "down") {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= cards.length) return;

    setCards((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next.map((c, i) => ({ ...c, position: i + 1 }));
    });
    setActiveCardIdx(targetIdx);
  }

  function handleDeleteCard(idx: number) {
    if (cards.length <= 1) {
      setFeedback({
        type: "ulang",
        message: "Materi harus memiliki minimal satu kartu.",
      });
      return;
    }
    setCards((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((c, i) => ({ ...c, position: i + 1 }))
    );
    setActiveCardIdx((prev) => Math.max(0, Math.min(prev, cards.length - 2)));
    setFeedback({ type: "info", message: "Kartu dihapus dari draf pratinjau." });
  }

  function handleAddCard() {
    const newPos = cards.length + 1;
    setCards((prev) => [
      ...prev,
      {
        id: `card-new-${Date.now()}`,
        lessonId: lesson.id,
        position: newPos,
        text: "Ketik kalimat kartu belajar baru...",
        cardType: "instruction",
        imageSource: "pictogram",
        audioSource: "none",
        imageAssetId: null,
        imageAlt: null,
        audioAssetId: null,
        imageUrl: null,
        audioRef: null,
        audioUrl: null,
        keyTerms: [],
        signOverride: null,
        voiceOverride: null,
        createdAt: new Date(),
      },
    ]);
    setActiveCardIdx(cards.length);
  }

  // Quiz modifications
  function updateQuestionPrompt(idx: number, prompt: string) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, prompt } : q))
    );
  }

  function updateQuestionType(idx: number, nextType: CanonicalQuestionType) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        const currentPayload =
          (q.payload as Record<string, unknown> | undefined) ?? {};
        if (nextType === "benar_salah") {
          return {
            ...q,
            type: "benar_salah",
            payload: {
              answer:
                typeof currentPayload.answer === "boolean"
                  ? currentPayload.answer
                  : true,
            },
          };
        }
        if (nextType === "arrange_steps") {
          const existingSteps = extractSteps(currentPayload);
          return {
            ...q,
            type: "arrange_steps",
            payload: {
              steps:
                existingSteps.length >= 2
                  ? existingSteps
                  : [
                      { id: "step-1", text: "Langkah 1" },
                      { id: "step-2", text: "Langkah 2" },
                      { id: "step-3", text: "Langkah 3" },
                    ],
            },
          };
        }
        const existingOpts = extractOptions(currentPayload);
        return {
          ...q,
          type: nextType,
          payload: {
            ...currentPayload,
            ...(nextType === "choice_sign"
              ? { signWord: extractSignWord(q) || "BELAJAR" }
              : {}),
            options:
              existingOpts.length >= 2
                ? existingOpts
                : [
                    { id: "opt-1", text: "Jawaban Benar", correct: true },
                    { id: "opt-2", text: "Pilihan Lain", correct: false },
                  ],
          },
        };
      })
    );
  }

  function handleMoveQuestion(idx: number, direction: "up" | "down") {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next.map((q, i) => ({ ...q, position: i + 1 }));
    });
    setActiveQuestionIdx(targetIdx);
  }

  function handleAddOption(qIdx: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const currentPayload = (q.payload as Record<string, unknown>) || {};
        const opts = extractOptions(currentPayload);
        if (opts.length >= 4) return q;

        const newId = `opt-${opts.length + 1}-${Date.now()}`;
        return {
          ...q,
          payload: {
            ...currentPayload,
            options: [
              ...opts,
              { id: newId, text: `Pilihan ${opts.length + 1}`, correct: false },
            ],
          },
        };
      })
    );
  }

  function handleRemoveOption(qIdx: number, optId: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const currentPayload = (q.payload as Record<string, unknown>) || {};
        const opts = extractOptions(currentPayload);
        if (opts.length <= 2) {
          setFeedback({
            type: "ulang",
            message: "Minimal harus ada 2 pilihan jawaban.",
          });
          return q;
        }
        const remaining = opts.filter((o) => o.id !== optId);
        if (!remaining.some((o) => o.correct) && remaining[0]) {
          remaining[0] = { ...remaining[0], correct: true };
        }
        return {
          ...q,
          payload: {
            ...currentPayload,
            options: remaining,
          },
        };
      })
    );
  }

  function handleToggleCorrectOption(qIdx: number, optId: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const currentPayload = (q.payload as Record<string, unknown>) || {};
        const opts = extractOptions(currentPayload).map((o) => ({
          ...o,
          correct: o.id === optId,
        }));
        return {
          ...q,
          payload: {
            ...currentPayload,
            options: opts,
          },
        };
      })
    );
  }

  function handleUpdateStepText(qIdx: number, stepId: string, text: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const currentPayload = (q.payload as Record<string, unknown>) || {};
        const steps = extractSteps(currentPayload).map((s) =>
          s.id === stepId ? { ...s, text } : s
        );
        return { ...q, payload: { ...currentPayload, steps } };
      })
    );
  }

  function handleAddStep(qIdx: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const currentPayload = (q.payload as Record<string, unknown>) || {};
        const steps = extractSteps(currentPayload);
        if (steps.length >= 5) return q;
        return {
          ...q,
          payload: {
            ...currentPayload,
            steps: [
              ...steps,
              {
                id: `step-${steps.length + 1}-${Date.now()}`,
                text: `Langkah ${steps.length + 1}`,
              },
            ],
          },
        };
      })
    );
  }

  function handleRemoveStep(qIdx: number, stepId: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const currentPayload = (q.payload as Record<string, unknown>) || {};
        const steps = extractSteps(currentPayload);
        if (steps.length <= 2) {
          setFeedback({
            type: "ulang",
            message: "Soal susun urutan memerlukan minimal 2 langkah.",
          });
          return q;
        }
        return {
          ...q,
          payload: {
            ...currentPayload,
            steps: steps.filter((s) => s.id !== stepId),
          },
        };
      })
    );
  }

  function handleAddQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-new-${Date.now()}`,
        lessonId: lesson.id,
        position: prev.length + 1,
        type: "choice_word",
        prompt: "Apa yang kamu pelajari dari kartu ini?",
        payload: {
          options: [
            { id: `opt-1-${Date.now()}`, text: "Jawaban Benar", correct: true },
            { id: `opt-2-${Date.now()}`, text: "Pilihan Lain", correct: false },
            { id: `opt-3-${Date.now()}`, text: "Pilihan Ketiga", correct: false },
          ],
          showTextHint: true,
        },
        keyTerms: [],
        signOverride: null,
        linkedCardId: null,
        explanation: null,
        createdAt: new Date(),
      },
    ]);
    setActiveQuestionIdx(questions.length);
  }

  function handleDeleteQuestion(idx: number) {
    setQuestions((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((q, i) => ({ ...q, position: i + 1 }))
    );
    setActiveQuestionIdx((prev) =>
      Math.max(0, Math.min(prev, questions.length - 2))
    );
    setFeedback({ type: "info", message: "Soal dihapus dari daftar latihan." });
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Header Editor Terstruktur */}
      <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/guru/materi"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--primary)] hover:underline"
          >
            <Icon name="CaretLeft" size={16} />
            <span>Pustaka Materi</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
            <span>{cards.length} kartu</span>
            <span aria-hidden="true">&bull;</span>
            <span>{questions.length} soal</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  isPublished
                    ? "bg-[var(--benar-bg)] text-[var(--benar-ink)] border-[var(--benar-edge)]"
                    : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"
                }`}
              >
                {isPublished ? "Sudah Terbit" : "Draf"}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-2)] uppercase">
                {lesson.level}
              </span>
              {primaryShareCode && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border border-[var(--border)] bg-[var(--accent-subtle)] text-[var(--primary)]">
                  Kode: {primaryShareCode}
                </span>
              )}
            </div>

            {isEditingMeta ? (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-3 max-w-2xl">
                <Field
                  id="lesson-meta-title"
                  label="Judul Materi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Field
                  id="lesson-meta-topic"
                  label="Topik Singkat"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="compact"
                    onClick={() => {
                      setTitle(lesson.title);
                      setTopic(lesson.topic);
                      setIsEditingMeta(false);
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="compact"
                    loading={isSaving}
                    onClick={handleSaveMeta}
                  >
                    Simpan Judul
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <div className="flex items-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)] leading-tight">
                    {title}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setIsEditingMeta(true)}
                    aria-label="Ubah judul dan topik materi"
                    className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] cursor-pointer transition-colors"
                  >
                    <Icon name="NotePencil" size={16} />
                  </button>
                </div>
                {topic && (
                  <p className="mt-1 text-sm text-[var(--ink-2)]">
                    Topik: {topic}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Aksi Cepat Halaman Editor */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 shrink-0">
            <ShareLessonButton
              lessonId={lesson.id}
              lessonTitle={title}
              shares={activeShares}
              variant="primary"
              size="normal"
              className="w-full sm:w-auto justify-center"
              onPublished={(share) => setLocalShare(share)}
            />
            <Button
              variant="secondary"
              size="normal"
              href={tvHref}
              icon={<Icon name="Television" size={18} />}
              className="w-full sm:w-auto justify-center"
            >
              Presentasi TV
            </Button>
            <Button
              variant="secondary"
              size="normal"
              href={`/guru/materi/${lesson.id}/cetak`}
              icon={<Icon name="Cards" size={18} />}
              className="w-full sm:w-auto justify-center"
            >
              Cetak Kartu
            </Button>
            <Button
              variant="secondary"
              size="normal"
              href={`/guru/materi/${lesson.id}/hasil`}
              icon={<Icon name="ChartBar" size={18} />}
              className="w-full sm:w-auto justify-center"
            >
              Hasil
            </Button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <StatusMessage type={feedback.type}>{feedback.message}</StatusMessage>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Tutup pemberitahuan"
            className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
          >
            <Icon name="X" size={16} />
          </button>
        </div>
      )}

      {/* Segmented Tab Navigasi */}
      <div
        role="tablist"
        aria-label="Bagian penyuntingan materi"
        className="flex flex-wrap sm:inline-flex sm:self-start gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1.5"
      >
        {(
          [
            ["kartu", `Kartu (${cards.length})`, "Cards"],
            ["kuis", `Kuis (${questions.length})`, "ListChecks"],
            ["isyarat_suara", "Isyarat & Suara", "Hand"],
          ] as const
        ).map(([tabKey, label, ic]) => {
          const isActive = activeTab === tabKey;
          return (
            <button
              key={tabKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tabKey)}
              className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] shadow-xs"
                  : "text-[var(--ink-2)] border border-transparent hover:text-[var(--ink)] hover:bg-[var(--surface)]/50"
              }`}
            >
              <Icon
                name={ic as IconName}
                size={18}
                className={isActive ? "text-[var(--primary)]" : "text-[var(--muted)]"}
              />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: KARTU BELAJAR (Studio Split Layout + Live Preview) */}
      {activeTab === "kartu" && (
        <section className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--ink)]">
                Kartu Belajar &amp; Pratinjau Siswa
              </h2>
              <p className="text-sm text-[var(--ink-2)]">
                Pilih kartu di daftar untuk menyunting kalimat, kata isyarat, gambar, dan suara.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="normal"
              onClick={handleAddCard}
              icon={<Icon name="Plus" size={18} />}
              className="w-full sm:w-auto shrink-0"
            >
              Tambah Kartu
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Navigator Kartu (Kiri di Desktop, Strip di Mobile) */}
            <aside className="lg:col-span-4 flex flex-col gap-2">
              <div className="flex lg:hidden gap-2 overflow-x-auto pb-1">
                {cards.map((c, idx) => {
                  const selected = idx === safeCardIdx;
                  return (
                    <button
                      key={c.id ?? idx}
                      type="button"
                      onClick={() => setActiveCardIdx(idx)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                        selected
                          ? "bg-[var(--primary)] text-[var(--on-primary)] border-[var(--primary)]"
                          : "bg-[var(--surface)] text-[var(--ink)] border-[var(--border)]"
                      }`}
                    >
                      <span>#{c.position}</span>
                      <span className="max-w-[110px] truncate">{c.text}</span>
                    </button>
                  );
                })}
              </div>

              <Card
                padding="compact"
                className="hidden lg:flex flex-col gap-2 p-3"
              >
                <span className="px-2 pt-1 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Urutan Kartu ({cards.length})
                </span>
                <div className="flex flex-col gap-1.5 max-h-[620px] overflow-y-auto pr-0.5">
                  {cards.map((c, idx) => {
                    const selected = idx === safeCardIdx;
                    const wc = c.text.trim().split(/\s+/).filter(Boolean).length;
                    return (
                      <button
                        key={c.id ?? idx}
                        type="button"
                        onClick={() => setActiveCardIdx(idx)}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          selected
                            ? "border-[var(--primary)] bg-[var(--accent-subtle)] shadow-xs"
                            : "border-transparent bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] hover:border-[var(--border)]"
                        }`}
                      >
                        <span
                          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-extrabold ${
                            selected
                              ? "bg-[var(--primary)] text-[var(--on-primary)]"
                              : "bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-2)]"
                          }`}
                        >
                          {c.position}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--ink)] line-clamp-2 leading-snug">
                            {c.text}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                            <span>{wc} kata</span>
                            {c.imageUrl && (
                              <span className="inline-flex items-center gap-0.5 text-[var(--primary)] font-semibold">
                                <Icon name="Image" size={12} />
                                <span>Gambar</span>
                              </span>
                            )}
                            {c.audioRef && (
                              <span className="inline-flex items-center gap-0.5 text-[var(--benar-ink)] font-semibold">
                                <Icon name="Microphone" size={12} />
                                <span>Rekaman</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </aside>

            {/* Editor Kartu Aktif + Pratinjau (Kanan) */}
            {activeCard && (() => {
              const wordCount = activeCard.text
                .trim()
                .split(/\s+/)
                .filter(Boolean).length;
              const isWordLimitExceeded = wordCount > 7;
              const previewTerm =
                activeCard.keyTerms?.[0] ??
                activeCard.text
                  .split(/\s+/)
                  .map((w) => w.replace(/[^a-zA-Z]/g, ""))
                  .find((w) => w.length >= 2) ??
                "";

              return (
                <div className="lg:col-span-8 flex flex-col gap-5">
                  {/* Panel Sunting Kartu */}
                  <Card className="flex flex-col gap-5 p-5 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center rounded-lg bg-[var(--primary)] px-2.5 py-1 font-mono text-xs font-extrabold text-[var(--on-primary)]">
                          Kartu #{activeCard.position}
                        </span>
                        <span className="text-xs font-semibold text-[var(--muted)]">
                          {wordCount} kata &bull; {activeCard.text.length}/80 karakter
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="primary"
                          size="compact"
                          loading={isSavingCard}
                          onClick={() => handleSaveCard(safeCardIdx)}
                          icon={<Icon name="Check" size={14} />}
                          className="mr-1"
                        >
                          Simpan Kartu
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleMoveCard(safeCardIdx, "up")}
                          disabled={safeCardIdx === 0}
                          aria-label="Pindahkan kartu ke atas"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Icon name="CaretLeft" size={16} className="rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveCard(safeCardIdx, "down")}
                          disabled={safeCardIdx === cards.length - 1}
                          aria-label="Pindahkan kartu ke bawah"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Icon name="CaretLeft" size={16} className="-rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(safeCardIdx)}
                          aria-label="Hapus kartu ini"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--galat-edge)]/40 bg-[var(--galat-bg)]/40 text-[var(--galat-ink)] hover:bg-[var(--galat-bg)] cursor-pointer ml-1"
                        >
                          <Icon name="Trash" size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Teks Kalimat Kartu */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label
                          htmlFor={`card-text-${safeCardIdx}`}
                          className="text-sm font-semibold text-[var(--ink)]"
                        >
                          Teks Kalimat Kartu (Maks. 80 karakter)
                        </label>
                        {syncingCardId === activeCard.id ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)]">
                            <span
                              className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"
                              aria-hidden="true"
                            />
                            <span>Menyelaraskan piktogram &amp; SIBI...</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-[var(--muted)]">
                            Piktogram &amp; SIBI otomatis mengikuti teks
                          </span>
                        )}
                      </div>
                      <textarea
                        id={`card-text-${safeCardIdx}`}
                        rows={2}
                        maxLength={80}
                        value={activeCard.text}
                        onChange={(e) =>
                          updateCardText(safeCardIdx, e.target.value)
                        }
                        className="w-full rounded-[var(--r-input)] border border-[var(--border-strong)] bg-[var(--surface)] p-3.5 text-base sm:text-lg font-semibold leading-relaxed text-[var(--ink)] outline-none transition-[border-color,box-shadow] focus:border-[var(--border-focus)] focus:ring-[3px] focus:ring-[rgba(15,118,110,0.15)]"
                      />
                      {isWordLimitExceeded ? (
                        <p className="text-xs font-semibold text-[var(--ulang-ink)]">
                          Saran keterbacaan: Saat ini {wordCount} kata. Usahakan 3–7 kata singkat agar mudah diikuti siswa.
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--muted)]">
                          Gunakan kalimat singkat dan konkret (3–7 kata).
                        </p>
                      )}
                    </div>

                    {/* Kata Kunci Isyarat */}
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">
                        Kata Kunci Isyarat (SIBI)
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(activeCard.keyTerms ?? []).map((term) => (
                          <span
                            key={term}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/30 bg-[var(--accent-subtle)] px-3 py-1 text-xs font-bold text-[var(--ink)]"
                          >
                            <Icon
                              name="Hand"
                              size={14}
                              className="text-[var(--primary)]"
                            />
                            <span>{term}</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveKeyTerm(safeCardIdx, term)
                              }
                              aria-label={`Hapus kata kunci ${term}`}
                              className="rounded-full p-0.5 text-[var(--muted)] hover:text-[var(--galat-ink)] cursor-pointer"
                            >
                              <Icon name="X" size={12} />
                            </button>
                          </span>
                        ))}
                        {(activeCard.keyTerms ?? []).length === 0 && (
                          <span className="text-xs text-[var(--muted)]">
                            Belum ada kata kunci isyarat.
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 max-w-sm">
                        <input
                          type="text"
                          value={newKeyTerm}
                          onChange={(e) => setNewKeyTerm(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddKeyTerm(safeCardIdx);
                            }
                          }}
                          placeholder="Tambah kata kunci..."
                          aria-label="Tambah kata kunci isyarat"
                          className="h-9 flex-1 min-w-0 rounded-[var(--r-input)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--border-focus)]"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="compact"
                          onClick={() => handleAddKeyTerm(safeCardIdx)}
                          icon={<Icon name="Plus" size={14} />}
                        >
                          Tambah
                        </Button>
                      </div>
                    </div>

                    {/* Media: Gambar & Suara */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
                      {/* Gambar / Piktogram */}
                      <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                          Gambar / Piktogram
                        </span>

                        {activeCard.imageUrl ? (
                          <div className="flex flex-col gap-2">
                            <div className="relative aspect-[4/3] max-h-36 rounded-xl border border-[var(--border)] overflow-hidden bg-white flex items-center justify-center p-1.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={activeCard.imageUrl}
                                alt={activeCard.imageAlt ?? activeCard.text}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                size="compact"
                                onClick={() => {
                                  setActiveCardIndexForMedia(safeCardIdx);
                                  setIsPictoModalOpen(true);
                                }}
                                icon={<Icon name="Sparkle" size={14} />}
                              >
                                Ganti
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="compact"
                                onClick={() =>
                                  setCards((prev) =>
                                    prev.map((item, i) =>
                                      i === safeCardIdx
                                        ? {
                                            ...item,
                                            imageUrl: null,
                                            imageAlt: null,
                                          }
                                        : item
                                    )
                                  )
                                }
                                icon={<Icon name="Trash" size={14} />}
                                className="text-[var(--galat-ink)]"
                              >
                                Hapus
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="compact"
                              onClick={() => {
                                setActiveCardIndexForMedia(safeCardIdx);
                                setIsPictoModalOpen(true);
                              }}
                              icon={<Icon name="Sparkle" size={15} />}
                            >
                              Piktogram
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="compact"
                              onClick={() => {
                                setActiveCardIndexForMedia(safeCardIdx);
                                setIsUploadModalOpen(true);
                              }}
                              icon={<Icon name="UploadSimple" size={15} />}
                            >
                              Unggah Foto
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Suara Kartu */}
                      <div className="flex flex-col justify-between gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3.5">
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                            Suara Kartu
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="compact"
                              onClick={() =>
                                handlePlayAudioPreview(safeCardIdx, activeCard)
                              }
                              icon={
                                <Icon
                                  name={
                                    playingCardIdx === safeCardIdx
                                      ? "Pause"
                                      : "SpeakerHigh"
                                  }
                                  size={15}
                                />
                              }
                            >
                              {playingCardIdx === safeCardIdx
                                ? "Berhenti"
                                : "Dengar Suara"}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="compact"
                              onClick={() => {
                                setActiveCardIndexForMedia(safeCardIdx);
                                setIsAudioModalOpen(true);
                              }}
                              icon={<Icon name="Microphone" size={15} />}
                            >
                              {activeCard.audioRef
                                ? "Ubah Rekaman"
                                : "Rekam Suara"}
                            </Button>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-semibold flex items-center gap-1.5 ${
                            activeCard.audioRef
                              ? "text-[var(--benar-ink)]"
                              : "text-[var(--muted)]"
                          }`}
                        >
                          <Icon
                            name={
                              activeCard.audioRef
                                ? "CheckCircle"
                                : "SpeakerHigh"
                            }
                            size={14}
                          />
                          <span>
                            {activeCard.audioRef
                              ? "Rekaman guru terpasang"
                              : "Menggunakan suara sistem (TTS)"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Pratinjau Kartu Siswa */}
                  <Card className="flex flex-col gap-4 p-5 sm:p-6 bg-[var(--surface)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                        Pratinjau Tampilan Siswa
                      </span>
                      <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-semibold text-[var(--ink-2)]">
                        Kartu {activeCard.position} dari {cards.length}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 sm:p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                        <div className="sm:col-span-5">
                          {activeCard.imageUrl ? (
                            <div className="relative aspect-[4/3] w-full rounded-xl border border-[var(--border)] bg-white p-2 flex items-center justify-center overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={activeCard.imageUrl}
                                alt={activeCard.imageAlt ?? activeCard.text}
                                className={`h-full w-full object-contain transition-opacity ${
                                  syncingCardId === activeCard.id ? "opacity-50" : "opacity-100"
                                }`}
                              />
                              {syncingCardId === activeCard.id && (
                                <span className="absolute bottom-2 right-2 rounded-full bg-[var(--surface)]/90 px-2 py-0.5 text-[10px] font-bold text-[var(--primary)] shadow-sm border border-[var(--border)]">
                                  Memperbarui...
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="aspect-[4/3] w-full rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] flex flex-col items-center justify-center gap-1.5 p-3 text-center">
                              <Icon
                                name="Image"
                                size={28}
                                className="text-[var(--muted)]"
                              />
                              <span className="text-xs font-medium text-[var(--muted)]">
                                {activeCard.imageAlt || "Belum ada gambar"}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="sm:col-span-7 flex flex-col items-center sm:items-start gap-4 text-center sm:text-left">
                          <p className="text-xl sm:text-2xl font-bold leading-snug text-[var(--ink)]">
                            {renderCardTextWithKeyTerms(
                              activeCard.text,
                              activeCard.keyTerms
                            )}
                          </p>

                          {previewTerm && (
                            <div className="flex items-center gap-3">
                              <SignCard
                                system={signSystem}
                                term={previewTerm}
                                size="compact"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* TAB 2: KUIS LATIHAN (Studio Split Layout + Live Question Preview) */}
      {activeTab === "kuis" && (
        <section className="flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--ink)]">
                Soal Latihan &amp; Pratinjau Kuis
              </h2>
              <p className="text-sm text-[var(--ink-2)]">
                Kelola pertanyaan, jenis latihan, jawaban benar, serta lihat tampilan di layar siswa.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="normal"
              onClick={handleAddQuestion}
              icon={<Icon name="Plus" size={18} />}
              className="w-full sm:w-auto shrink-0"
            >
              Tambah Soal
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card className="p-8 text-center flex flex-col items-center gap-3">
              <Icon
                name="ListChecks"
                size={44}
                className="text-[var(--muted)]"
              />
              <h3 className="text-lg font-bold text-[var(--ink)]">
                Belum ada soal kuis
              </h3>
              <p className="text-sm text-[var(--ink-2)] max-w-md">
                Tambahkan soal latihan agar siswa bisa menguji pemahamannya setelah membaca kartu.
              </p>
              <Button
                type="button"
                variant="primary"
                size="normal"
                onClick={handleAddQuestion}
                icon={<Icon name="Plus" size={18} />}
              >
                Buat Soal Pertama
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Navigator Soal */}
              <aside className="lg:col-span-4 flex flex-col gap-2">
                <div className="flex lg:hidden gap-2 overflow-x-auto pb-1">
                  {questions.map((q, idx) => {
                    const selected = idx === safeQuestionIdx;
                    return (
                      <button
                        key={q.id ?? idx}
                        type="button"
                        onClick={() => {
                          setActiveQuestionIdx(idx);
                          resetPreview();
                        }}
                        className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                          selected
                            ? "bg-[var(--primary)] text-[var(--on-primary)] border-[var(--primary)]"
                            : "bg-[var(--surface)] text-[var(--ink)] border-[var(--border)]"
                        }`}
                      >
                        <span>Soal #{q.position}</span>
                      </button>
                    );
                  })}
                </div>

                <Card
                  padding="compact"
                  className="hidden lg:flex flex-col gap-2 p-3"
                >
                  <span className="px-2 pt-1 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Daftar Soal ({questions.length})
                  </span>
                  <div className="flex flex-col gap-1.5 max-h-[620px] overflow-y-auto pr-0.5">
                    {questions.map((q, idx) => {
                      const selected = idx === safeQuestionIdx;
                      return (
                        <button
                          key={q.id ?? idx}
                          type="button"
                          onClick={() => {
                          setActiveQuestionIdx(idx);
                          resetPreview();
                        }}
                          className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                            selected
                              ? "border-[var(--primary)] bg-[var(--accent-subtle)] shadow-xs"
                              : "border-transparent bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] hover:border-[var(--border)]"
                          }`}
                        >
                          <span
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-extrabold ${
                              selected
                                ? "bg-[var(--primary)] text-[var(--on-primary)]"
                                : "bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-2)]"
                            }`}
                          >
                            {q.position}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-[var(--primary)]">
                              {questionTypeLabel(q.type)}
                            </span>
                            <p className="text-sm font-semibold text-[var(--ink)] line-clamp-2 leading-snug mt-0.5">
                              {q.prompt}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </aside>

              {/* Editor Soal Aktif + Pratinjau */}
              {activeQuestion && (() => {
                const payload =
                  (activeQuestion.payload as Record<string, unknown>) ?? {};
                const qType = normalizeQuestionType(activeQuestion.type);
                const options = extractOptions(payload);
                const steps = extractSteps(payload);
                const tfAnswer =
                  typeof payload.answer === "boolean" ? payload.answer : true;
                const signWord = extractSignWord(activeQuestion);
                const promptImageUrl =
                  (payload.promptImageUrl as string | undefined) ??
                  (payload.imageUrl as string | undefined);

                return (
                  <div className="lg:col-span-8 flex flex-col gap-5">
                    {/* Panel Sunting Soal */}
                    <Card className="flex flex-col gap-5 p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="inline-flex items-center rounded-lg bg-[var(--primary)] px-2.5 py-1 font-mono text-xs font-extrabold text-[var(--on-primary)]">
                            Soal #{activeQuestion.position}
                          </span>
                          <select
                            aria-label="Jenis pertanyaan"
                            value={qType}
                            onChange={(e) =>
                              updateQuestionType(
                                safeQuestionIdx,
                                e.target.value as CanonicalQuestionType
                              )
                            }
                            className="h-9 px-3 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink)] cursor-pointer outline-none focus:border-[var(--border-focus)]"
                          >
                            <option value="choice_word">Pilihan Kata</option>
                            <option value="pilih_gambar">
                              Pilihan Bergambar
                            </option>
                            <option value="choice_sign">
                              Cocokkan Isyarat
                            </option>
                            <option value="benar_salah">Benar / Salah</option>
                            <option value="arrange_steps">Susun Urutan</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleMoveQuestion(safeQuestionIdx, "up")
                            }
                            disabled={safeQuestionIdx === 0}
                            aria-label="Pindahkan soal ke atas"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Icon
                              name="CaretLeft"
                              size={16}
                              className="rotate-90"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleMoveQuestion(safeQuestionIdx, "down")
                            }
                            disabled={safeQuestionIdx === questions.length - 1}
                            aria-label="Pindahkan soal ke bawah"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <Icon
                              name="CaretLeft"
                              size={16}
                              className="-rotate-90"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteQuestion(safeQuestionIdx)
                            }
                            aria-label="Hapus soal ini"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--galat-edge)]/40 bg-[var(--galat-bg)]/40 text-[var(--galat-ink)] hover:bg-[var(--galat-bg)] cursor-pointer ml-1"
                          >
                            <Icon name="Trash" size={16} />
                          </button>
                        </div>
                      </div>

                      <Field
                        id={`q-prompt-${safeQuestionIdx}`}
                        label="Teks Pertanyaan"
                        value={activeQuestion.prompt}
                        onChange={(e) =>
                          updateQuestionPrompt(safeQuestionIdx, e.target.value)
                        }
                      />

                      {qType === "choice_sign" && (
                        <Field
                          id={`q-signword-${safeQuestionIdx}`}
                          label="Kata Isyarat SIBI yang Ditampilkan"
                          placeholder="Contoh: BURUNG"
                          value={signWord}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQuestions((prev) =>
                              prev.map((item, i) =>
                                i === safeQuestionIdx
                                  ? {
                                      ...item,
                                      payload: {
                                        ...(item.payload as Record<
                                          string,
                                          unknown
                                        >),
                                        signWord: val,
                                      },
                                    }
                                  : item
                              )
                            );
                          }}
                        />
                      )}

                      {/* Pilihan Ganda / Gambar / Isyarat */}
                      {(qType === "choice_word" ||
                        qType === "pilih_gambar" ||
                        qType === "choice_sign") && (
                        <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border)]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                              Pilihan Jawaban ({options.length}/4)
                            </span>
                            {options.length < 4 && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="compact"
                                onClick={() => handleAddOption(safeQuestionIdx)}
                                icon={<Icon name="Plus" size={14} />}
                              >
                                Tambah Opsi
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {options.map((opt, optIdx) => (
                              <div
                                key={opt.id}
                                className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors ${
                                  opt.correct
                                    ? "border-[var(--benar-edge)] bg-[var(--benar-bg)]/45"
                                    : "border-[var(--border-strong)] bg-[var(--surface)]"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleCorrectOption(
                                      safeQuestionIdx,
                                      opt.id
                                    )
                                  }
                                  aria-pressed={opt.correct}
                                  title="Tandai sebagai jawaban benar"
                                  className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold border cursor-pointer transition-colors ${
                                    opt.correct
                                      ? "bg-[var(--benar-edge)] text-white border-[var(--benar-edge)]"
                                      : "bg-[var(--surface-2)] text-[var(--ink-2)] border-[var(--border)] hover:text-[var(--ink)]"
                                  }`}
                                >
                                  <Icon name="Check" size={13} />
                                  <span>{opt.correct ? "Benar" : `Opsi ${optIdx + 1}`}</span>
                                </button>

                                <input
                                  type="text"
                                  aria-label={`Teks opsi ${optIdx + 1}`}
                                  value={opt.text}
                                  onChange={(e) => {
                                    const newText = e.target.value;
                                    setQuestions((prev) =>
                                      prev.map((item, i) => {
                                        if (i !== safeQuestionIdx) return item;
                                        const currentP =
                                          (item.payload as Record<
                                            string,
                                            unknown
                                          >) || {};
                                        const nextOpts = extractOptions(
                                          currentP
                                        ).map((o) =>
                                          o.id === opt.id
                                            ? { ...o, text: newText }
                                            : o
                                        );
                                        return {
                                          ...item,
                                          payload: {
                                            ...currentP,
                                            options: nextOpts,
                                          },
                                        };
                                      })
                                    );
                                  }}
                                  className="h-9 flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm font-semibold text-[var(--ink)] outline-none focus:border-[var(--border-focus)]"
                                />

                                {options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveOption(
                                        safeQuestionIdx,
                                        opt.id
                                      )
                                    }
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--galat-ink)] hover:bg-[var(--galat-bg)] cursor-pointer"
                                    aria-label={`Hapus opsi ${opt.text}`}
                                  >
                                    <Icon name="X" size={15} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Benar / Salah */}
                      {qType === "benar_salah" && (
                        <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
                          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                            Kunci Jawaban
                          </span>
                          <div className="grid grid-cols-2 gap-3 max-w-sm">
                            {[true, false].map((val) => {
                              const selected = tfAnswer === val;
                              return (
                                <button
                                  key={String(val)}
                                  type="button"
                                  onClick={() =>
                                    setQuestions((prev) =>
                                      prev.map((item, i) =>
                                        i === safeQuestionIdx
                                          ? {
                                              ...item,
                                              payload: {
                                                ...(item.payload as Record<
                                                  string,
                                                  unknown
                                                >),
                                                answer: val,
                                              },
                                            }
                                          : item
                                      )
                                    )
                                  }
                                  className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 font-bold text-sm cursor-pointer transition-colors ${
                                    selected
                                      ? "border-[var(--benar-edge)] bg-[var(--benar-bg)] text-[var(--benar-ink)]"
                                      : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
                                  }`}
                                >
                                  <Icon
                                    name={val ? "CheckCircle" : "X"}
                                    size={18}
                                  />
                                  <span>{val ? "Benar" : "Salah"}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Susun Urutan */}
                      {qType === "arrange_steps" && (
                        <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border)]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                              Urutan Langkah Benar ({steps.length}/5)
                            </span>
                            {steps.length < 5 && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="compact"
                                onClick={() => handleAddStep(safeQuestionIdx)}
                                icon={<Icon name="Plus" size={14} />}
                              >
                                Tambah Langkah
                              </Button>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            {steps.map((step, sIdx) => (
                              <div
                                key={step.id}
                                className="flex items-center gap-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-2.5"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--on-primary)]">
                                  {sIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  aria-label={`Langkah ${sIdx + 1}`}
                                  value={step.text}
                                  onChange={(e) =>
                                    handleUpdateStepText(
                                      safeQuestionIdx,
                                      step.id,
                                      e.target.value
                                    )
                                  }
                                  className="h-9 flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-sm font-semibold text-[var(--ink)] outline-none focus:border-[var(--border-focus)]"
                                />
                                {steps.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveStep(safeQuestionIdx, step.id)
                                    }
                                    aria-label={`Hapus langkah ${sIdx + 1}`}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--galat-ink)] hover:bg-[var(--galat-bg)] cursor-pointer"
                                  >
                                    <Icon name="X" size={15} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Pratinjau Soal Siswa */}
                    <Card className="flex flex-col gap-4 p-5 sm:p-6 bg-[var(--surface)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                          Pratinjau Soal Siswa
                        </span>
                        <div className="flex items-center gap-2">
                          {previewFeedback !== null && (
                            <button
                              type="button"
                              onClick={resetPreview}
                              className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-semibold text-[var(--ink-2)] hover:text-[var(--ink)] cursor-pointer"
                            >
                              Ulangi
                            </button>
                          )}
                          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-semibold text-[var(--ink-2)]">
                            Soal {activeQuestion.position} dari {questions.length}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 sm:p-6 flex flex-col items-center gap-4 text-center">
                        {promptImageUrl && (
                          <div className="h-28 w-28 rounded-2xl border border-[var(--border)] bg-white p-2 flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={promptImageUrl}
                              alt={activeQuestion.prompt}
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}

                        <h3 className="text-lg sm:text-xl font-bold text-[var(--ink)] max-w-[36ch] leading-snug">
                          {activeQuestion.prompt}
                        </h3>

                        {qType === "choice_sign" && signWord && (
                          <SignCard
                            system={signSystem}
                            term={signWord}
                            size="compact"
                          />
                        )}

                        {(qType === "choice_word" ||
                          qType === "pilih_gambar" ||
                          qType === "choice_sign") &&
                          options.length > 0 && (
                            <div
                              className={`w-full grid gap-3 ${
                                options.length === 2
                                  ? "grid-cols-2"
                                  : options.length === 3
                                    ? "grid-cols-1 sm:grid-cols-3"
                                    : "grid-cols-1 sm:grid-cols-2"
                              }`}
                            >
                              {options.map((opt) => {
                                const isSelected =
                                  previewSelectedOptionId === opt.id;
                                let optStyle =
                                  "border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]";
                                if (isSelected && previewFeedback === "benar") {
                                  optStyle =
                                    "border-[var(--benar-edge)] bg-[var(--benar-bg)] text-[var(--benar-ink)]";
                                } else if (
                                  isSelected &&
                                  previewFeedback === "ulang"
                                ) {
                                  optStyle =
                                    "border-[var(--ulang-edge)] bg-[var(--ulang-bg)] text-[var(--ulang-ink)]";
                                }
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => {
                                      setPreviewSelectedOptionId(opt.id);
                                      setPreviewFeedback(
                                        opt.correct ? "benar" : "ulang"
                                      );
                                    }}
                                    className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-bold cursor-pointer transition-colors ${optStyle}`}
                                  >
                                    {opt.imageUrl && (
                                      <div className="h-14 w-14 rounded-lg bg-white p-1 border border-[var(--border)] flex items-center justify-center overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={opt.imageUrl}
                                          alt={opt.text}
                                          className="h-full w-full object-contain"
                                        />
                                      </div>
                                    )}
                                    <span>{opt.text}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                        {qType === "benar_salah" && (
                          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
                            {[
                              { val: true, id: "tf-true", label: "Benar", icon: "CheckCircle" as const },
                              { val: false, id: "tf-false", label: "Salah", icon: "X" as const },
                            ].map((item) => {
                              const isSelected =
                                previewSelectedOptionId === item.id;
                              let tfStyle =
                                "border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]";
                              if (isSelected && previewFeedback === "benar") {
                                tfStyle =
                                  "border-[var(--benar-edge)] bg-[var(--benar-bg)] text-[var(--benar-ink)]";
                              } else if (
                                isSelected &&
                                previewFeedback === "ulang"
                              ) {
                                tfStyle =
                                  "border-[var(--ulang-edge)] bg-[var(--ulang-bg)] text-[var(--ulang-ink)]";
                              }
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  aria-pressed={isSelected}
                                  onClick={() => {
                                    setPreviewSelectedOptionId(item.id);
                                    setPreviewFeedback(
                                      item.val === tfAnswer ? "benar" : "ulang"
                                    );
                                  }}
                                  className={`flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 font-bold text-sm cursor-pointer transition-colors ${tfStyle}`}
                                >
                                  <Icon name={item.icon} size={18} />
                                  <span>{item.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {qType === "arrange_steps" && steps.length > 0 && (() => {
                          const stepMap = new Map(steps.map((s) => [s.id, s]));
                          const defaultIds =
                            steps.length >= 2
                              ? [...steps.slice(1), steps[0]!].map((s) => s.id)
                              : steps.map((s) => s.id);
                          const currentIds =
                            previewOrderIds &&
                            previewOrderIds.length === steps.length &&
                            previewOrderIds.every((id) => stepMap.has(id))
                              ? previewOrderIds
                              : defaultIds;
                          const orderedPreviewSteps = currentIds.map(
                            (id) => stepMap.get(id)!
                          );

                          function swapPreviewSteps(idxA: number, idxB: number) {
                            const next = [...currentIds];
                            const tmp = next[idxA]!;
                            next[idxA] = next[idxB]!;
                            next[idxB] = tmp;
                            setPreviewOrderIds(next);
                            setPreviewSelectedStepId(null);
                            setPreviewFeedback(null);
                          }

                          return (
                            <div className="w-full max-w-md flex flex-col gap-2 text-left">
                              {orderedPreviewSteps.map((step, sIdx) => {
                                const isPicked =
                                  previewSelectedStepId === step.id;
                                return (
                                  <div
                                    key={step.id}
                                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-colors ${
                                      isPicked
                                        ? "border-[var(--primary)] bg-[var(--accent-subtle)] text-[var(--ink)]"
                                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink)]"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!previewSelectedStepId) {
                                          setPreviewSelectedStepId(step.id);
                                        } else if (
                                          previewSelectedStepId === step.id
                                        ) {
                                          setPreviewSelectedStepId(null);
                                        } else {
                                          const fromIdx = currentIds.indexOf(
                                            previewSelectedStepId
                                          );
                                          if (fromIdx >= 0) {
                                            swapPreviewSteps(fromIdx, sIdx);
                                          }
                                        }
                                      }}
                                      className="flex flex-1 items-center gap-3 text-left cursor-pointer"
                                    >
                                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--on-primary)]">
                                        {sIdx + 1}
                                      </span>
                                      <span>{step.text}</span>
                                    </button>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        disabled={sIdx === 0}
                                        aria-label={`Naikkan langkah ${sIdx + 1}`}
                                        onClick={() =>
                                          swapPreviewSteps(sIdx, sIdx - 1)
                                        }
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs font-bold disabled:opacity-35 cursor-pointer"
                                      >
                                        ↑
                                      </button>
                                      <button
                                        type="button"
                                        disabled={
                                          sIdx === orderedPreviewSteps.length - 1
                                        }
                                        aria-label={`Turunkan langkah ${sIdx + 1}`}
                                        onClick={() =>
                                          swapPreviewSteps(sIdx, sIdx + 1)
                                        }
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-xs font-bold disabled:opacity-35 cursor-pointer"
                                      >
                                        ↓
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              <Button
                                type="button"
                                variant="secondary"
                                size="compact"
                                onClick={() => {
                                  const isMatch = orderedPreviewSteps.every(
                                    (s, idx) => s.id === steps[idx]?.id
                                  );
                                  setPreviewFeedback(
                                    isMatch ? "benar" : "ulang"
                                  );
                                }}
                                className="mt-1 w-full"
                              >
                                Periksa Urutan
                              </Button>
                            </div>
                          );
                        })()}

                        {previewFeedback === "benar" && (
                          <StatusMessage type="benar">Benar!</StatusMessage>
                        )}
                        {previewFeedback === "ulang" && (
                          <StatusMessage type="ulang">
                            Coba lagi. Pilihan ini belum tepat.
                          </StatusMessage>
                        )}
                      </div>
                    </Card>
                  </div>
                );
              })()}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: ISYARAT & SUARA */}
      {activeTab === "isyarat_suara" && (
        <section className="flex flex-col gap-6">
          <SignVoiceReviewPanel
            signSystem={signSystem}
            signScope={signScope}
            onChangeSignScope={setSignScope}
            signSpeed={signSpeed}
            onChangeSignSpeed={setSignSpeed}
            voiceKey={voiceKey}
            onChangeVoiceKey={setVoiceKey}
            voiceSpeed={voiceSpeed}
            onChangeVoiceSpeed={setVoiceSpeed}
            sampleCard={cards[0]}
          />

          <div className="flex justify-end">
            <Button
              variant="primary"
              size="large"
              loading={isSaving}
              onClick={async () => {
                setIsSaving(true);
                const res = await updatePresentationAction(lesson.id, {
                  signSystem,
                  signScope,
                  signSpeed,
                  voiceKey,
                  voiceSpeed,
                });
                setIsSaving(false);
                if (res.ok) {
                  setFeedback({
                    type: "benar",
                    message: "Pengaturan isyarat dan suara berhasil disimpan!",
                  });
                  router.refresh();
                } else {
                  setFeedback({ type: "galat", message: res.error.message });
                }
              }}
              icon={<Icon name="CheckCircle" size={20} />}
              className="w-full sm:w-auto"
            >
              {isSaving ? "Menyimpan..." : "Simpan Pengaturan Isyarat & Suara"}
            </Button>
          </div>
        </section>
      )}

      {/* MODAL PIKTOGRAM */}
      {isPictoModalOpen && (
        <PictogramModal
          isOpen={isPictoModalOpen}
          onClose={() => {
            setIsPictoModalOpen(false);
            setActiveCardIndexForMedia(null);
          }}
          initialKeyword={
            activeCardIndexForMedia !== null
              ? cards[activeCardIndexForMedia]?.text.slice(0, 10)
              : ""
          }
          onSelect={({ imageUrl, imageAlt }) => {
            if (activeCardIndexForMedia !== null) {
              setCards((prev) =>
                prev.map((c, i) =>
                  i === activeCardIndexForMedia
                    ? { ...c, imageUrl, imageAlt, imageSource: "pictogram" }
                    : c
                )
              );
            }
          }}
        />
      )}

      {/* MODAL UNGGAH FOTO */}
      {isUploadModalOpen && (
        <ImageUploader
          isOpen={isUploadModalOpen}
          onClose={() => {
            setIsUploadModalOpen(false);
            setActiveCardIndexForMedia(null);
          }}
          onUploadComplete={({ imageUrl, imageAlt }) => {
            if (activeCardIndexForMedia !== null) {
              setCards((prev) =>
                prev.map((c, i) =>
                  i === activeCardIndexForMedia
                    ? { ...c, imageUrl, imageAlt, imageSource: "upload" }
                    : c
                )
              );
            }
          }}
        />
      )}

      {/* MODAL REKAM AUDIO */}
      {isAudioModalOpen && (
        <AudioRecorder
          isOpen={isAudioModalOpen}
          onClose={() => {
            setIsAudioModalOpen(false);
            setActiveCardIndexForMedia(null);
          }}
          cardText={
            activeCardIndexForMedia !== null
              ? cards[activeCardIndexForMedia]?.text ?? ""
              : ""
          }
          onAudioSaved={(audioUrl) => {
            if (activeCardIndexForMedia !== null) {
              setCards((prev) =>
                prev.map((c, i) =>
                  i === activeCardIndexForMedia
                    ? { ...c, audioRef: audioUrl, audioSource: "recording" }
                    : c
                )
              );
            }
          }}
        />
      )}
    </div>
  );
}
