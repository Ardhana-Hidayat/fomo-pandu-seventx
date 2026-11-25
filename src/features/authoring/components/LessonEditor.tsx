"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Chip, Field, Icon, type IconName, StatusMessage } from "@/shared/ui";
import { approveAndPublishAction } from "../actions";
import { PictogramModal } from "./PictogramModal";
import { ImageUploader } from "./ImageUploader";
import { AudioRecorder } from "./AudioRecorder";
import { SignVoiceReviewPanel } from "./SignVoiceReviewPanel";
import { updatePresentationAction } from "../actions";
import type { LessonWithContent } from "@/server/repos/lessons";

interface LessonEditorProps {
  lesson: LessonWithContent;
  classrooms: Array<{ id: string; name: string; joinCode: string }>;
}

export function LessonEditor({ lesson, classrooms }: LessonEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"kartu" | "kuis" | "isyarat_suara" | "terbitkan">("kartu");

  const [title] = useState(lesson.title);
  const [cards, setCards] = useState(lesson.cards);
  const [questions, setQuestions] = useState(lesson.questions);

  // Pack 2: State Pengaturan Isyarat & Suara
  const [signSystem, setSignSystem] = useState<"SIBI" | "BISINDO">((lesson.signSystem as "SIBI" | "BISINDO") ?? "SIBI");
  const [signScope, setSignScope] = useState<"key_terms" | "all">((lesson.signScope as "key_terms" | "all") ?? "key_terms");
  const [signSpeed, setSignSpeed] = useState<number>(lesson.signSpeed ?? 1.0);
  const [voiceKey, setVoiceKey] = useState<string>(lesson.voiceKey ?? "A");
  const [voiceSpeed, setVoiceSpeed] = useState<number>(lesson.voiceSpeed ?? 1.0);
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>(
    classrooms.map((c) => c.id).slice(0, 1)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Modal states for media tools
  const [activeCardIndexForMedia, setActiveCardIndexForMedia] = useState<number | null>(null);
  const [isPictoModalOpen, setIsPictoModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);

  // Audio preview
  const [playingCardIdx, setPlayingCardIdx] = useState<number | null>(null);

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
      utt.rate = 0.9;
      setPlayingCardIdx(idx);
      utt.onend = () => setPlayingCardIdx(null);
      utt.onerror = () => setPlayingCardIdx(null);
      window.speechSynthesis.speak(utt);
    }
  }

  // Card modifications
  function updateCardText(idx: number, newText: string) {
    setCards((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, text: newText } : c))
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
  }

  function handleDeleteCard(idx: number) {
    if (cards.length <= 1) {
      alert("Materi harus memiliki minimal satu kartu.");
      return;
    }
    setCards((prev) =>
      prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, position: i + 1 }))
    );
    setStatusMsg("Kartu berhasil dihapus.");
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
  }

  // Quiz modifications
  function updateQuestionPrompt(idx: number, prompt: string) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, prompt } : q))
    );
  }

  function updateQuestionType(idx: number, type: (typeof questions)[number]["type"]) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== idx) return q;
        if (type === "benar_salah") {
          return {
            ...q,
            type,
            payload: { answer: true },
          };
        }
        return {
          ...q,
          type,
          payload: {
            options: [
              { id: "opt-1", text: "Pilihan 1", correct: true },
              { id: "opt-2", text: "Pilihan 2", correct: false },
            ],
          },
        };
      })
    );
  }

  function handleAddOption(qIdx: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const currentPayload = (q.payload as {
          options?: Array<{ id: string; text: string; correct: boolean }>;
        }) || { options: [] };
        const opts = currentPayload.options ?? [];
        if (opts.length >= 4) return q;

        const newId = `opt-${opts.length + 1}-${Date.now()}`;
        return {
          ...q,
          payload: {
            ...currentPayload,
            options: [...opts, { id: newId, text: `Pilihan ${opts.length + 1}`, correct: false }],
          },
        };
      })
    );
  }

  function handleRemoveOption(qIdx: number, optId: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const currentPayload = (q.payload as {
          options?: Array<{ id: string; text: string; correct: boolean }>;
        }) || { options: [] };
        const opts = currentPayload.options ?? [];
        if (opts.length <= 2) {
          alert("Minimal harus ada 2 pilihan jawaban.");
          return q;
        }
        return {
          ...q,
          payload: {
            ...currentPayload,
            options: opts.filter((o) => o.id !== optId),
          },
        };
      })
    );
  }

  function handleToggleCorrectOption(qIdx: number, optId: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const currentPayload = (q.payload as {
          options?: Array<{ id: string; text: string; correct: boolean }>;
        }) || { options: [] };
        const opts = (currentPayload.options ?? []).map((o) => ({
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

  function handleAddQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-new-${Date.now()}`,
        lessonId: lesson.id,
        position: prev.length + 1,
        type: "pilih_kata",
        prompt: "Apa yang kamu pelajari?",
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
  }

  function handleDeleteQuestion(idx: number) {
    setQuestions((prev) =>
      prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, position: i + 1 }))
    );
  }

  async function handleApproveAndPublish() {
    if (selectedClassrooms.length === 0) {
      alert("Pilih minimal satu kelas tujuan.");
      return;
    }

    setIsSaving(true);
    const res = await approveAndPublishAction(lesson.id, selectedClassrooms);
    setIsSaving(false);

    if (res.ok) {
      setStatusMsg("Materi berhasil disetujui dan dibagikan ke kelas!");
      router.refresh();
    } else {
      alert(res.error.message);
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl">
      {/* Header Editor */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-2 border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                lesson.status === "published"
                  ? "bg-emerald-100 text-emerald-900 border-emerald-500"
                  : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"
              }`}
            >
              {lesson.status === "published" ? "Sudah Terbit" : "Draf"}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--ink)] mt-1">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="normal"
            href={`/guru/materi/${lesson.id}/presentasi`}
            icon={<Icon name="Television" size={18} />}
          >
            Presentasi TV
          </Button>
          <Button
            variant="secondary"
            size="normal"
            href={`/guru/materi/${lesson.id}/cetak`}
            icon={<Icon name="Copy" size={18} />}
          >
            Cetak Kartu
          </Button>
        </div>
      </div>

      {statusMsg && <StatusMessage type="benar">{statusMsg}</StatusMessage>}

      {/* Tab Navigasi */}
      <div className="flex gap-2 border-b-2 border-[var(--border)] pb-2 flex-wrap">
        {(
          [
            ["kartu", `Kartu (${cards.length})`, "Cards"],
            ["kuis", `Kuis (${questions.length})`, "ListChecks"],
            ["isyarat_suara", "Isyarat & Suara", "Hand"],
            ["terbitkan", "Tampilan & Bagikan", "DoorOpen"],
          ] as const
        ).map(([tabKey, label, ic]) => (
          <Chip
            key={tabKey}
            label={label}
            selected={activeTab === tabKey}
            onSelect={() => setActiveTab(tabKey)}
            icon={<Icon name={ic as IconName} size={20} />}
            role="radio"
          />
        ))}
      </div>

      {/* TAB KARTU */}
      {activeTab === "kartu" && (
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--ink)]">
              Sunting Kartu Belajar &amp; Media
            </h2>
            <Button
              type="button"
              variant="secondary"
              size="normal"
              onClick={handleAddCard}
              icon={<Icon name="Plus" size={18} />}
            >
              Tambah Kartu
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            {cards.map((c, idx) => {
              const wordCount = c.text.trim().split(/\s+/).filter(Boolean).length;
              const isWordLimitExceeded = wordCount > 7;

              return (
                <Card key={c.id ?? idx} className="flex flex-col gap-4 p-5">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm px-2.5 py-1 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                        Kartu #{c.position}
                      </span>
                      <span className="text-xs text-[var(--muted)] font-medium">
                        {wordCount} kata &bull; {c.text.length} / 80 karakter
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveCard(idx, "up")}
                        disabled={idx === 0}
                        aria-label="Pindahkan kartu ke atas"
                        className="p-1.5 rounded hover:bg-[var(--surface-2)] disabled:opacity-30 cursor-pointer"
                      >
                        <Icon name="CaretLeft" size={18} className="rotate-90" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCard(idx, "down")}
                        disabled={idx === cards.length - 1}
                        aria-label="Pindahkan kartu ke bawah"
                        className="p-1.5 rounded hover:bg-[var(--surface-2)] disabled:opacity-30 cursor-pointer"
                      >
                        <Icon name="CaretLeft" size={18} className="-rotate-90" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(idx)}
                        aria-label="Hapus kartu ini"
                        className="p-1.5 rounded hover:bg-red-50 text-red-600 cursor-pointer ml-2"
                      >
                        <Icon name="Trash" size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Kalimat Kartu */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`card-text-${idx}`} className="text-sm font-bold text-[var(--ink)]">
                      Kalimat Kartu (Maks. 80 karakter)
                    </label>
                    <textarea
                      id={`card-text-${idx}`}
                      rows={2}
                      maxLength={80}
                      value={c.text}
                      onChange={(e) => updateCardText(idx, e.target.value)}
                      className="w-full p-3 rounded-[var(--r-input)] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] font-bold text-lg"
                    />
                    {isWordLimitExceeded && (
                      <span className="text-xs text-amber-700 font-bold">
                        Peringatan lembut: Lebih dari 7 kata. Untuk hambatan intelektual, usahakan 3 sampai 7 kata.
                      </span>
                    )}
                  </div>

                  {/* Media Tools: Gambar & Suara */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
                    {/* Kolom Gambar */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-[var(--muted)] uppercase">
                        Gambar / Piktogram
                      </span>

                      {c.imageUrl ? (
                        <div className="relative aspect-[4/3] max-h-36 rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-2)] flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.imageUrl}
                            alt={c.imageAlt ?? c.text}
                            className="w-full h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setCards((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, imageUrl: null, imageAlt: null } : item
                                )
                              )
                            }
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
                            aria-label="Hapus gambar"
                          >
                            <Icon name="Trash" size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="normal"
                            onClick={() => {
                              setActiveCardIndexForMedia(idx);
                              setIsPictoModalOpen(true);
                            }}
                            icon={<Icon name="Sparkle" size={16} />}
                          >
                            Piktogram
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="normal"
                            onClick={() => {
                              setActiveCardIndexForMedia(idx);
                              setIsUploadModalOpen(true);
                            }}
                            icon={<Icon name="UploadSimple" size={16} />}
                          >
                            Unggah Foto
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Kolom Suara */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-[var(--muted)] uppercase">
                        Suara Kartu
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="normal"
                          onClick={() => handlePlayAudioPreview(idx, c)}
                          icon={
                            <Icon
                              name={playingCardIdx === idx ? "Pause" : "SpeakerHigh"}
                              size={16}
                            />
                          }
                        >
                          {playingCardIdx === idx ? "Berhenti" : "Dengar Suara"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="normal"
                          onClick={() => {
                            setActiveCardIndexForMedia(idx);
                            setIsAudioModalOpen(true);
                          }}
                          icon={<Icon name="Microphone" size={16} />}
                        >
                          {c.audioRef ? "Ubah Rekaman" : "Rekam Suara"}
                        </Button>
                      </div>
                      {c.audioRef && (
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                          <Icon name="CheckCircle" size={14} />
                          <span>Audio terpasang</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB KUIS */}
      {activeTab === "kuis" && (
        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--ink)]">
              Daftar Soal Latihan &amp; Variasi Pilihan
            </h2>
            <Button
              type="button"
              variant="secondary"
              size="normal"
              onClick={handleAddQuestion}
              icon={<Icon name="Plus" size={18} />}
            >
              Tambah Soal
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            {questions.map((q, idx) => {
              const payload = (q.payload as {
                options?: Array<{ id: string; text: string; correct: boolean }>;
                showTextHint?: boolean;
                imageOnly?: boolean;
                answer?: boolean;
              }) || {};

              const options = payload.options ?? [];

              return (
                <Card key={q.id ?? idx} className="flex flex-col gap-4 p-5">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xs px-2.5 py-1 rounded bg-[var(--primary)] text-white">
                        Soal #{q.position}
                      </span>
                      <select
                        value={q.type}
                        onChange={(e) =>
                          updateQuestionType(
                            idx,
                            e.target.value as (typeof questions)[number]["type"]
                          )
                        }
                        className="h-10 px-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] font-bold text-xs cursor-pointer"
                      >
                        <option value="pilih_kata">Pilihan Kata (2-4 Opsi)</option>
                        <option value="pilih_gambar">Pilihan Bergambar</option>
                        <option value="benar_salah">Benar / Salah</option>
                        <option value="urutan">Susun Urutan</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(idx)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-600 cursor-pointer"
                      aria-label="Hapus soal ini"
                    >
                      <Icon name="Trash" size={18} />
                    </button>
                  </div>

                  {/* Kalimat Soal */}
                  <Field
                    id={`q-prompt-${idx}`}
                    label="Teks Pertanyaan"
                    value={q.prompt}
                    onChange={(e) => updateQuestionPrompt(idx, e.target.value)}
                  />

                  {/* Pengaturan Variasi Soal */}
                  {q.type !== "benar_salah" && q.type !== "urutan" && (
                    <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border)]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--muted)] uppercase">
                          Pilihan Jawaban ({options.length} Pilihan)
                        </span>
                        {options.length < 4 && (
                          <button
                            type="button"
                            onClick={() => handleAddOption(idx)}
                            className="text-xs font-bold text-[var(--link)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Icon name="Plus" size={14} />
                            <span>Tambah Opsi (Maks. 4)</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 ${
                              opt.correct
                                ? "border-emerald-600 bg-emerald-50/50"
                                : "border-[var(--border)] bg-[var(--surface)]"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct-opt-${idx}`}
                              checked={opt.correct}
                              onChange={() => handleToggleCorrectOption(idx, opt.id)}
                              className="h-5 w-5 accent-emerald-700 cursor-pointer shrink-0"
                              title="Tandai sebagai jawaban benar"
                            />
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => {
                                const newText = e.target.value;
                                setQuestions((prev) =>
                                  prev.map((item, i) => {
                                    if (i !== idx) return item;
                                    const currentP = (item.payload as {
                                      options?: Array<{ id: string; text: string; correct: boolean }>;
                                    }) || {};
                                    return {
                                      ...item,
                                      payload: {
                                        ...currentP,
                                        options: (currentP.options ?? []).map((o) =>
                                          o.id === opt.id ? { ...o, text: newText } : o
                                        ),
                                      },
                                    };
                                  })
                                );
                              }}
                              className="flex-1 p-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-bold"
                            />
                            {options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(idx, opt.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                aria-label="Hapus opsi"
                              >
                                <Icon name="X" size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB ISYARAT & SUARA (Pack 2 Berkas 05) */}
      {activeTab === "isyarat_suara" && (
        <section className="flex flex-col gap-6">
          <SignVoiceReviewPanel
            signSystem={signSystem}
            onChangeSignSystem={setSignSystem}
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
              disabled={isSaving}
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
                  setStatusMsg("Pengaturan isyarat dan suara berhasil disimpan!");
                  router.refresh();
                } else {
                  alert(res.error.message);
                }
              }}
              icon={<Icon name="CheckCircle" size={20} />}
            >
              {isSaving ? "Menyimpan..." : "Simpan Pengaturan Isyarat & Suara"}
            </Button>
          </div>
        </section>
      )}

      {/* TAB TERBITKAN */}
      {activeTab === "terbitkan" && (
        <Card as="section" className="flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">
              Bagikan ke Ruang Kelas
            </h2>
            <p className="text-sm text-[var(--ink-2)] mt-1">
              Dengan membagikan materi, status materi menjadi <strong>Terbit</strong> dan siswa dapat langsung membukanya.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-bold text-base text-[var(--ink)]">
              Pilih Ruang Kelas
            </span>
            <div className="flex flex-wrap gap-2">
              {classrooms.map((c) => {
                const isSelected = selectedClassrooms.includes(c.id);
                return (
                  <Chip
                    key={c.id}
                    label={`${c.name} (Kode: ${c.joinCode})`}
                    selected={isSelected}
                    onSelect={() => {
                      setSelectedClassrooms((prev) =>
                        isSelected ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                      );
                    }}
                    role="checkbox"
                  />
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t-2 border-[var(--border)]">
            <Button
              variant="primary"
              size="large"
              disabled={isSaving}
              onClick={handleApproveAndPublish}
              icon={<Icon name="CheckCircle" size={24} />}
              className="w-full sm:w-auto"
            >
              {isSaving ? "Menerbitkan..." : "Setujui dan bagikan"}
            </Button>
          </div>
        </Card>
      )}

      {/* MODAL PIKTOGRAM */}
      <PictogramModal
        isOpen={isPictoModalOpen}
        onClose={() => {
          setIsPictoModalOpen(false);
          setActiveCardIndexForMedia(null);
        }}
        initialKeyword={
          activeCardIndexForMedia !== null ? cards[activeCardIndexForMedia]?.text.slice(0, 10) : ""
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

      {/* MODAL UNGGAH FOTO */}
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

      {/* MODAL REKAM AUDIO */}
      <AudioRecorder
        isOpen={isAudioModalOpen}
        onClose={() => {
          setIsAudioModalOpen(false);
          setActiveCardIndexForMedia(null);
        }}
        cardText={activeCardIndexForMedia !== null ? cards[activeCardIndexForMedia]?.text ?? "" : ""}
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
    </div>
  );
}
