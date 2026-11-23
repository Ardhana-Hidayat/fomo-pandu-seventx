"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Field, Chip, Icon, type IconName, StatusMessage } from "@/shared/ui";
import { createLessonAction } from "../actions";
import { SignVoiceReviewPanel } from "./SignVoiceReviewPanel";

interface ClassroomOption {
  id: string;
  name: string;
  joinCode: string;
}

interface LessonWizardProps {
  classrooms: ClassroomOption[];
  preselectedClassroomId?: string;
}

interface GeneratedCard {
  position: number;
  text: string;
  keyTerms: string[];
  imageAlt: string;
}

interface GeneratedQuestion {
  position: number;
  type: string;
  prompt: string;
  options?: Array<{ id: string; text: string; correct: boolean }>;
}

export function LessonWizard({
  classrooms,
  preselectedClassroomId,
}: LessonWizardProps) {
  const router = useRouter();

  // Wizard Steps
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Sumber
  const [sourceType, setSourceType] = useState<"topik" | "teks" | "pdf" | "foto">("topik");
  const [title, setTitle] = useState("Mengenal Benda di Sekitar");
  const [contentPrompt, setContentPrompt] = useState("Cara mencuci tangan dengan sabun dan air mengalir.");

  // Step 2: Pilihan
  const [disabilityPresets, setDisabilityPresets] = useState<string[]>(["tunarungu", "hambatan_intelektual"]);
  const [cardCount, setCardCount] = useState<number>(5);
  const [quizType, setQuizType] = useState<string>("campuran");

  // Step 3: Pengaturan Isyarat & Suara (Pack 2)
  const [signSystem, setSignSystem] = useState<"SIBI" | "BISINDO">("SIBI");
  const [signScope, setSignScope] = useState<"key_terms" | "all">("key_terms");
  const [signSpeed, setSignSpeed] = useState<number>(1.0);
  const [voiceKey, setVoiceKey] = useState<string>("A");
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);

  // Step 3: Periksa (Hasil Pembuatan)
  const [cards] = useState<GeneratedCard[]>([
    { position: 1, text: "Siapkan air bersih dan sabun.", keyTerms: ["air", "sabun"], imageAlt: "Keran air dan sabun" },
    { position: 2, text: "Basahi kedua tangan dengan air mengalir.", keyTerms: ["tangan", "air"], imageAlt: "Membasahi tangan" },
    { position: 3, text: "Gosok sabun sampai berbusa lembut.", keyTerms: ["sabun", "gosok"], imageAlt: "Menggosok sabun di tangan" },
    { position: 4, text: "Bilas tangan sampai bersih.", keyTerms: ["bilas", "bersih"], imageAlt: "Membilas tangan" },
    { position: 5, text: "Keringkan tangan dengan handuk bersih.", keyTerms: ["kering", "handuk"], imageAlt: "Handuk bersih" },
  ]);

  const [questions] = useState<GeneratedQuestion[]>([
    {
      position: 1,
      type: "match",
      prompt: "Mana benda yang dipakai untuk mencuci tangan?",
      options: [
        { id: "a", text: "Sabun", correct: true },
        { id: "b", text: "Buku", correct: false },
        { id: "c", text: "Sepatu", correct: false },
      ],
    },
    {
      position: 2,
      type: "match",
      prompt: "Tangan dikeringkan dengan apa?",
      options: [
        { id: "a", text: "Handuk", correct: true },
        { id: "b", text: "Air", correct: false },
      ],
    },
  ]);

  // Step 4: Bagikan
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>(
    preselectedClassroomId ? [preselectedClassroomId] : classrooms.map((c) => c.id).slice(0, 1)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleFinalize(publishNow: boolean) {
    setIsSubmitting(true);

    const payloadCards = cards.map((c) => ({
      position: c.position,
      text: c.text,
      keyTerms: c.keyTerms,
      cardType: "instruction" as const,
      imageSource: "pictogram" as const,
      imageAlt: c.imageAlt,
      audioSource: "tts" as const,
    }));

    const payloadQuestions = questions.map((q) => ({
      position: q.position,
      type: q.type,
      prompt: q.prompt,
      payload: {
        options: q.options?.map((o) => ({
          id: o.id,
          text: o.text,
          correct: o.correct,
        })),
      },
    }));

    const result = await createLessonAction({
      title,
      topic: contentPrompt,
      level: "sdlb",
      sourceType,
      generatedBy: "fallback",
      cards: payloadCards,
      questions: payloadQuestions,
      classroomIdsToPublish: publishNow ? selectedClassrooms : undefined,
      signSystem,
      signScope,
      signSpeed,
      voiceKey,
      voiceSpeed,
    });

    if (result.ok) {
      if (publishNow && selectedClassrooms.length > 0) {
        const targetClass = selectedClassrooms[0];
        router.push(`/guru/kelas/${targetClass}`);
      } else {
        router.push(`/guru/materi/${result.data.id}/edit`);
      }
    } else {
      setIsSubmitting(false);
      alert(result.error.message);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Indikator Langkah */}
      <div className="flex items-center justify-between border-b-2 border-[var(--border)] pb-3">
        <span className="text-sm font-bold text-[var(--muted)]">
          Langkah {step} dari 4:{" "}
          {step === 1
            ? "Sumber Materi"
            : step === 2
            ? "Pilihan Kebutuhan"
            : step === 3
            ? "Periksa Kartu & Kuis"
            : "Tampilan & Terbitkan"}
        </span>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-2.5 w-8 rounded-full ${
                step >= i ? "bg-[var(--primary)]" : "bg-[var(--surface-2)]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* LANGKAH 1: SUMBER */}
      {step === 1 && (
        <Card as="section" className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">
              Dari mana materi dibuat?
            </h2>
            <p className="text-sm text-[var(--ink-2)] mt-1">
              Pilih sumber awal untuk menyusun kartu belajar dan kuis adaptif.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["topik", "Topik Singkat", "FileText"],
                ["teks", "Teks / Catatan Guru", "NotePencil"],
                ["pdf", "Unggah PDF", "FilePdf"],
                ["foto", "Foto Halaman Buku", "Image"],
              ] as const
            ).map(([val, label, ic]) => (
              <Chip
                key={val}
                label={label}
                selected={sourceType === val}
                onSelect={() => setSourceType(val)}
                icon={<Icon name={ic as IconName} size={20} />}
                role="radio"
              />
            ))}
          </div>

          <Field
            id="lesson-title"
            label="Judul Materi"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="content-prompt" className="font-bold text-[var(--ink)] text-base">
              {sourceType === "topik"
                ? "Topik Pembelajaran"
                : sourceType === "teks"
                ? "Isi Teks Pembelajaran"
                : "Deskripsi Materi"}
            </label>
            <textarea
              id="content-prompt"
              rows={4}
              value={contentPrompt}
              onChange={(e) => setContentPrompt(e.target.value)}
              className="w-full p-4 rounded-[var(--r-input)] border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-base font-sans"
              placeholder="Contoh: Langkah cuci tangan yang bersih sebelum makan..."
            />
          </div>

          <div className="flex justify-end pt-3 border-t-2 border-[var(--border)]">
            <Button
              variant="primary"
              size="large"
              onClick={() => setStep(2)}
              icon={<Icon name="CaretRight" size={20} />}
              iconPosition="right"
            >
              Lanjut ke Pilihan
            </Button>
          </div>
        </Card>
      )}

      {/* LANGKAH 2: PILIHAN */}
      {step === 2 && (
        <Card as="section" className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">
              Siapa yang Belajar?
            </h2>
            <p className="text-sm text-[var(--ink-2)] mt-1">
              Sesuaikan dengan kebutuhan khusus siswa di kelas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["tunanetra", "Tunanetra"],
                ["low_vision", "Low Vision"],
                ["tunarungu", "Tunarungu"],
                ["tunawicara", "Tunawicara"],
                ["hambatan_intelektual", "Hambatan Intelektual"],
              ] as const
            ).map(([val, label]) => {
              const isSelected = disabilityPresets.includes(val);
              return (
                <Chip
                  key={val}
                  label={label}
                  selected={isSelected}
                  onSelect={() => {
                    setDisabilityPresets((prev) =>
                      isSelected ? prev.filter((p) => p !== val) : [...prev, val]
                    );
                  }}
                  role="checkbox"
                />
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-bold text-[var(--ink)] text-base">
              Jumlah Kartu Materi
            </span>
            <div className="flex gap-2">
              {[5, 8, 12].map((num) => (
                <Chip
                  key={num}
                  label={`${num} Kartu`}
                  selected={cardCount === num}
                  onSelect={() => setCardCount(num)}
                  role="radio"
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-bold text-[var(--ink)] text-base">
              Jenis Kuis
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                ["pilih_gambar", "Pilih Gambar"],
                ["pilih_kata", "Pilih Kata"],
                ["urutkan", "Urutkan"],
                ["campuran", "Campuran (Disarankan)"],
              ].map(([val, label]) => (
                <Chip
                  key={val}
                  label={label}
                  selected={quizType === val}
                  onSelect={() => setQuizType(val)}
                  role="radio"
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t-2 border-[var(--border)]">
            <Button
              variant="secondary"
              size="large"
              onClick={() => setStep(1)}
              icon={<Icon name="CaretLeft" size={20} />}
            >
              Kembali
            </Button>
            <Button
              variant="primary"
              size="large"
              onClick={() => setStep(3)}
              icon={<Icon name="CaretRight" size={20} />}
              iconPosition="right"
            >
              Susun Materi
            </Button>
          </div>
        </Card>
      )}

      {/* LANGKAH 3: PERIKSA */}
      {step === 3 && (
        <Card as="section" className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">
              Periksa Hasil Penyusunan
            </h2>
            <p className="text-sm text-[var(--ink-2)] mt-1">
              Periksa kartu dan kuis yang telah disusun. Anda dapat menyuntingnya kapan saja.
            </p>
          </div>

          <StatusMessage type="info">
            Materi disusun dari contoh standar kurikulum SLB. Semua kartu siap disajikan dalam suara dan bahasa isyarat.
          </StatusMessage>

          {/* Panel Isyarat dan Suara (Pack 2 Berkas 05) */}
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

          {/* Daftar Kartu */}
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-base text-[var(--ink)]">
              Daftar Kartu Belajar ({cards.length})
            </h3>
            {cards.map((c, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex items-start gap-3"
              >
                <span className="font-bold text-sm px-2 py-1 rounded bg-[var(--surface)] border border-[var(--border)]">
                  #{c.position}
                </span>
                <div className="flex-1">
                  <p className="font-bold text-[var(--ink)] text-base">{c.text}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Kata kunci isyarat: {c.keyTerms.join(", ")} &bull; Gambar: {c.imageAlt}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Daftar Kuis */}
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-base text-[var(--ink)]">
              Latihan Soal Kuis ({questions.length})
            </h3>
            {questions.map((q, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs px-2 py-0.5 rounded bg-[var(--primary)] text-white">
                    Soal {q.position}
                  </span>
                  <span className="font-bold text-sm text-[var(--ink)]">{q.prompt}</span>
                </div>
                {q.options && (
                  <div className="flex flex-wrap gap-2 ml-4">
                    {q.options.map((o) => (
                      <span
                        key={o.id}
                        className={`text-xs px-2.5 py-1 rounded-full border font-bold ${
                          o.correct
                            ? "bg-emerald-100 border-emerald-600 text-emerald-900"
                            : "bg-[var(--surface)] border-[var(--border)] text-[var(--ink)]"
                        }`}
                      >
                        {o.text} {o.correct && "✓"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t-2 border-[var(--border)]">
            <Button
              variant="secondary"
              size="large"
              onClick={() => setStep(2)}
              icon={<Icon name="CaretLeft" size={20} />}
            >
              Kembali
            </Button>
            <Button
              variant="primary"
              size="large"
              onClick={() => setStep(4)}
              icon={<Icon name="CaretRight" size={20} />}
              iconPosition="right"
            >
              Lanjut ke Terbitkan
            </Button>
          </div>
        </Card>
      )}

      {/* LANGKAH 4: TERBITKAN */}
      {step === 4 && (
        <Card as="section" className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold text-[var(--ink)]">
              Terbitkan Materi ke Kelas
            </h2>
            <p className="text-sm text-[var(--ink-2)] mt-1">
              Pilih ruang kelas agar siswa dapat langsung membuka materi ini.
            </p>
          </div>

          {classrooms.length === 0 ? (
            <StatusMessage type="ulang">
              Anda belum memiliki ruang kelas. Materi akan disimpan sebagai draf di pustaka materi Anda.
            </StatusMessage>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="font-bold text-base text-[var(--ink)]">
                Pilih Ruang Kelas
              </span>
              <div className="flex flex-wrap gap-2">
                {classrooms.map((c) => {
                  const isChecked = selectedClassrooms.includes(c.id);
                  return (
                    <Chip
                      key={c.id}
                      label={`${c.name} (Kode: ${c.joinCode})`}
                      selected={isChecked}
                      onSelect={() => {
                        setSelectedClassrooms((prev) =>
                          isChecked ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                        );
                      }}
                      role="checkbox"
                    />
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t-2 border-[var(--border)]">
            <Button
              variant="secondary"
              size="large"
              onClick={() => setStep(3)}
              icon={<Icon name="CaretLeft" size={20} />}
            >
              Kembali
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="large"
                disabled={isSubmitting}
                onClick={() => handleFinalize(false)}
              >
                Simpan draf
              </Button>
              <Button
                variant="primary"
                size="large"
                disabled={isSubmitting}
                onClick={() => handleFinalize(true)}
                icon={<Icon name="CheckCircle" size={20} />}
              >
                {isSubmitting ? "Menyimpan..." : "Setujui dan bagikan"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
