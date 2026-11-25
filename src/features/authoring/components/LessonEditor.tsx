"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Chip,
  Field,
  Icon,
  type IconName,
  StatusMessage,
} from "@/shared/ui";
import { SignCard } from "@/features/player";
import {
  approveAndPublishAction,
  updateLessonAction,
  updatePresentationAction,
} from "../actions";
import type { LessonWithContent } from "@/server/repos/lessons";

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
  classrooms: Array<{ id: string; name: string; joinCode: string }>;
}

type EditorTab = "kartu" | "kuis" | "isyarat_suara" | "terbitkan";
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

export function LessonEditor({ lesson, classrooms }: LessonEditorProps) {
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

  // Pengaturan Isyarat & Suara (dikunci ke SIBI)
  const signSystem = "SIBI" as const;
  const [signScope, setSignScope] = useState<"key_terms" | "all">(
    (lesson.signScope as "key_terms" | "all") ?? "key_terms"
  );
  const [signSpeed, setSignSpeed] = useState<number>(lesson.signSpeed ?? 1.0);
  const [voiceKey, setVoiceKey] = useState<string>(lesson.voiceKey ?? "A");
  const [voiceSpeed, setVoiceSpeed] = useState<number>(lesson.voiceSpeed ?? 1.0);

  const publishedClassroomIds = useMemo(
    () => (lesson.publications ?? []).map((p) => p.classroomId),
    [lesson.publications]
  );

  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>(() =>
    publishedClassroomIds.length > 0
      ? publishedClassroomIds
      : classrooms.map((c) => c.id).slice(0, 1)
  );

  const [isSaving, setIsSaving] = useState(false);
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

  const primaryPub = lesson.publications?.[0];
  const primaryClassroom = classrooms.find(
    (c) => c.id === primaryPub?.classroomId
  );
  const tvHref = primaryClassroom
    ? `/tv/${primaryClassroom.joinCode}/${lesson.id}`
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
    setCards((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, text: newText } : c))
    );
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

  async function handleApproveAndPublish() {
    if (selectedClassrooms.length === 0) {
      setFeedback({
        type: "ulang",
        message: "Pilih minimal satu kelas tujuan sebelum membagikan materi.",
      });
      return;
    }

    setIsSaving(true);
    const res = await approveAndPublishAction(lesson.id, selectedClassrooms);
    setIsSaving(false);

    if (res.ok) {
      setFeedback({
        type: "benar",
        message: "Materi berhasil disetujui dan dibagikan ke kelas!",
      });
      router.refresh();
    } else {
      setFeedback({ type: "galat", message: res.error.message });
    }
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
                  lesson.status === "published"
                    ? "bg-[var(--benar-bg)] text-[var(--benar-ink)] border-[var(--benar-edge)]"
                    : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"
                }`}
              >
                {lesson.status === "published" ? "Sudah Terbit" : "Draf"}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-2)] uppercase">
                {lesson.level}
              </span>
              {primaryPub?.shareCode && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border border-[var(--border)] bg-[var(--accent-subtle)] text-[var(--primary)]">
                  Kode: {primaryPub.shareCode}
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
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="normal"
              href={tvHref}
              icon={<Icon name="Television" size={18} />}
            >
              Presentasi TV
            </Button>
            <Button
              variant="secondary"
              size="normal"
              href={`/guru/materi/${lesson.id}/cetak`}
              icon={<Icon name="Cards" size={18} />}
            >
              Cetak Kartu
            </Button>
            <Button
              variant="ghost"
              size="normal"
              href={`/guru/materi/${lesson.id}/hasil`}
              icon={<Icon name="ChartBar" size={18} />}
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
        className="grid grid-cols-2 sm:inline-flex sm:self-start gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1.5"
      >
        {(
          [
            ["kartu", `Kartu (${cards.length})`, "Cards"],
            ["kuis", `Kuis (${questions.length})`, "ListChecks"],
            ["isyarat_suara", "Isyarat & Suara", "Hand"],
            ["terbitkan", "Bagikan & Terbit", "DoorOpen"],
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

                    {/* Kalimat Kartu */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`card-text-${safeCardIdx}`}
                        className="text-sm font-semibold text-[var(--ink)]"
                      >
                        Kalimat Kartu (Maks. 80 karakter)
                      </label>
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
                            <div className="aspect-[4/3] w-full rounded-xl border border-[var(--border)] bg-white p-2 flex items-center justify-center overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={activeCard.imageUrl}
                                alt={activeCard.imageAlt ?? activeCard.text}
                                className="h-full w-full object-contain"
                              />
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
                        onClick={() => setActiveQuestionIdx(idx)}
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
                          onClick={() => setActiveQuestionIdx(idx)}
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
                        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-xs font-semibold text-[var(--ink-2)]">
                          Soal {activeQuestion.position} dari {questions.length}
                        </span>
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
                              {options.map((opt) => (
                                <div
                                  key={opt.id}
                                  className={`flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-bold ${
                                    opt.correct
                                      ? "border-[var(--benar-edge)] bg-[var(--benar-bg)]/45 text-[var(--ink)]"
                                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink)]"
                                  }`}
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
                                </div>
                              ))}
                            </div>
                          )}

                        {qType === "benar_salah" && (
                          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
                            <div
                              className={`flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 font-bold text-sm ${
                                tfAnswer
                                  ? "border-[var(--benar-edge)] bg-[var(--benar-bg)]/50 text-[var(--benar-ink)]"
                                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)]"
                              }`}
                            >
                              <Icon name="CheckCircle" size={18} />
                              <span>Benar</span>
                            </div>
                            <div
                              className={`flex min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 font-bold text-sm ${
                                !tfAnswer
                                  ? "border-[var(--benar-edge)] bg-[var(--benar-bg)]/50 text-[var(--benar-ink)]"
                                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-2)]"
                              }`}
                            >
                              <Icon name="X" size={18} />
                              <span>Salah</span>
                            </div>
                          </div>
                        )}

                        {qType === "arrange_steps" && (
                          <div className="w-full max-w-md flex flex-col gap-2 text-left">
                            {steps.map((step, sIdx) => (
                              <div
                                key={step.id}
                                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-bold text-[var(--ink)]"
                              >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--on-primary)]">
                                  {sIdx + 1}
                                </span>
                                <span>{step.text}</span>
                              </div>
                            ))}
                          </div>
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

      {/* TAB 4: BAGIKAN & TERBITKAN */}
      {activeTab === "terbitkan" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <Card as="section" className="lg:col-span-7 flex flex-col gap-5 p-5 sm:p-6">
            <div>
              <h2 className="text-xl font-bold text-[var(--ink)]">
                Bagikan ke Ruang Kelas
              </h2>
              <p className="text-sm text-[var(--ink-2)] mt-1">
                Dengan membagikan materi, status materi menjadi{" "}
                <strong>Terbit</strong> dan siswa dapat membukanya memakai Kode Materi atau Kode QR.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="font-bold text-sm text-[var(--ink)]">
                Pilih Ruang Kelas
              </span>
              {classrooms.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  Belum ada ruang kelas aktif. Buat ruang kelas terlebih dahulu di halaman beranda guru.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {classrooms.map((c) => {
                    const isSelected = selectedClassrooms.includes(c.id);
                    return (
                      <Chip
                        key={c.id}
                        label={`${c.name} (${c.joinCode})`}
                        selected={isSelected}
                        onSelect={() => {
                          setSelectedClassrooms((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== c.id)
                              : [...prev, c.id]
                          );
                        }}
                        role="checkbox"
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex flex-wrap gap-3">
              <Button
                variant="primary"
                size="large"
                loading={isSaving}
                disabled={classrooms.length === 0}
                onClick={handleApproveAndPublish}
                icon={<Icon name="CheckCircle" size={22} />}
                className="w-full sm:w-auto"
              >
                {isSaving ? "Menerbitkan..." : "Setujui dan Bagikan"}
              </Button>
            </div>
          </Card>

          <Card className="lg:col-span-5 flex flex-col gap-4 p-5 sm:p-6">
            <h3 className="text-base font-bold text-[var(--ink)]">
              Akses &amp; Cetak Kartu
            </h3>
            {lesson.publications && lesson.publications.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {lesson.publications.map((pub) => {
                  const cls = classrooms.find((c) => c.id === pub.classroomId);
                  return (
                    <div
                      key={pub.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-[var(--muted)] truncate">
                          {cls?.name ?? "Ruang Kelas"}
                        </span>
                        <span className="font-mono text-base font-extrabold tracking-widest text-[var(--primary)]">
                          {pub.shareCode}
                        </span>
                      </div>
                      <Link
                        href={`/m/${pub.shareCode}`}
                        className="text-xs font-bold text-[var(--link)] hover:underline shrink-0"
                      >
                        Buka Tautan
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Materi masih berstatus Draf. Terbitkan ke kelas untuk mendapatkan Kode Materi.
              </p>
            )}

            <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                variant="secondary"
                size="normal"
                href={`/guru/materi/${lesson.id}/cetak`}
                icon={<Icon name="Cards" size={18} />}
                className="w-full justify-center"
              >
                Cetak Kartu Fisik (A4)
              </Button>
              <Button
                variant="secondary"
                size="normal"
                href={tvHref}
                icon={<Icon name="Television" size={18} />}
                className="w-full justify-center"
              >
                Buka Mode TV
              </Button>
            </div>
          </Card>
        </div>
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
                    ? { ...c, imageUrl, imageAlt, imageSource: "piktogram" }
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
