import { notFound, redirect } from "next/navigation";
import { getCurrentTeacher } from "@/features/auth";
import { getTeacherLesson } from "@/features/authoring";
import { Button, Icon } from "@/shared/ui";

export const instant = false;

export default async function PrintCardsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentTeacher();
  if (!session) redirect("/guru/masuk");

  const { id } = await params;
  const lesson = await getTeacherLesson(id, session.teacher.id);
  if (!lesson) notFound();

  return (
    <div className="min-h-screen bg-white text-black p-4 sm:p-8">
      {/* Tombol Cetak - Tersembunyi saat dicetak (@media print) */}
      <div className="print:hidden mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Cetak Kartu Fisik: {lesson.title}</h1>
          <p className="text-sm text-gray-600">
            Format 4 kartu per halaman A4 siap gunting.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="normal"
            href={`/guru/materi/${lesson.id}/edit`}
          >
            Kembali
          </Button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-[48px] items-center gap-2 px-6 py-2 rounded-xl bg-black text-white font-bold cursor-pointer"
          >
            <Icon name="Copy" size={20} />
            <span>Cetak Sekarang</span>
          </button>
        </div>
      </div>

      {/* Kisi Cetak A4: 2x2 grid dengan garis potong */}
      <div className="grid grid-cols-2 gap-4 max-w-[210mm] mx-auto">
        {lesson.cards.map((c) => (
          <div
            key={c.id}
            className="border-2 border-dashed border-gray-400 p-6 rounded-2xl flex flex-col justify-between min-h-[120mm]"
          >
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span className="font-bold">Kartu #{c.position}</span>
              <span>{lesson.title}</span>
            </div>

            <div className="my-auto text-center">
              <p className="text-2xl font-bold text-black mb-3">{c.text}</p>
              {c.imageAlt && (
                <div className="inline-block border border-gray-300 rounded-lg p-2 text-xs text-gray-700 bg-gray-50">
                  Peraga: {c.imageAlt}
                </div>
              )}
            </div>

            <div className="border-t pt-2 text-xs text-gray-400 text-center">
              Gunting mengikuti garis putus-putus
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
