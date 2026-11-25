import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateLearningCardsWithAI } from '@/lib/gemini';

const RequestSchema = z.object({
  topic: z.string().min(2, 'Topik pembelajaran harus diisi minimal 2 karakter.'),
  rombel: z.string().default('Rombel B & D (Tunarungu-Wicara & Tunagrahita)'),
  signPreference: z.enum(['SIBI', 'BISINDO']).default('SIBI'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Input tidak valid.' },
        { status: 400 }
      );
    }

    const { topic, rombel } = parsed.data;

    const cards = await generateLearningCardsWithAI(topic, rombel, 'SIBI');

    return NextResponse.json({
      success: true,
      data: cards,
    });
  } catch (error) {
    console.error('API Error /api/ai/generate-cards:', error);
    return NextResponse.json(
      { error: 'Gagal membuat kartu peraga. Coba beberapa saat lagi.' },
      { status: 500 }
    );
  }
}
