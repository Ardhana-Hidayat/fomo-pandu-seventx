"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Chip, Icon, type IconName, StatusMessage } from "@/shared/ui";
import { approveAndPublishAction } from "../actions";
import type { LessonWithContent } from "@/server/repos/lessons";

interface LessonEditorProps {
  lesson: LessonWithContent;
  classrooms: Array<{ id: string; name: string; joinCode: string }>;
}

export function LessonEditor({ lesson, classrooms }: LessonEditorProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"kartu" | "kuis" | "terbitkan">("kartu");

  const [title] = useState(lesson.title);
  const [cards] = useState(lesson.cards);
  const [questions] = useState(lesson.questions);
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>(
    classrooms.map((c) => c.id).slice(0, 1)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

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
    <div className="flex flex-col gap-6 max-w-4xl">
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
      <div className="flex gap-2 border-b-2 border-[var(--border)] pb-2">
        {(
          [
            ["kartu", `Kartu (${cards.length})`, "Cards"],
            ["kuis", `Kuis (${questions.length})`, "ListChecks"],
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
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--ink)]">
              Daftar Kartu Materi
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {cards.map((c, idx) => (
              <Card key={c.id ?? idx} className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm px-2.5 py-1 rounded bg-[var(--surface-2)] border border-[var(--border)]">
                    Kartu #{c.position}
                  </span>
                  <span className="text-xs font-semibold text-[var(--muted)]">
                    Isyarat: {Array.isArray(c.keyTerms) ? c.keyTerms.join(", ") : "Otomatis"}
                  </span>
                </div>
                <p className="text-xl font-bold text-[var(--ink)]">{c.text}</p>
                {c.imageAlt && (
                  <p className="text-xs text-[var(--muted)] italic">
                    Gambar: {c.imageAlt}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* TAB KUIS */}
      {activeTab === "kuis" && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-[var(--ink)]">
            Daftar Soal Kuis
          </h2>
          <div className="flex flex-col gap-3">
            {questions.map((q, idx) => (
              <Card key={q.id ?? idx} className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs px-2.5 py-1 rounded bg-[var(--primary)] text-white">
                    Soal #{q.position} ({q.type})
                  </span>
                </div>
                <p className="text-base font-bold text-[var(--ink)]">{q.prompt}</p>
              </Card>
            ))}
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
    </div>
  );
}
