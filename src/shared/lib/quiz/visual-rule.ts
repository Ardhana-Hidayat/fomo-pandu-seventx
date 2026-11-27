export interface NormalizedQuizOption {
  id: string;
  text: string;
  imageUrl?: string;
  correct: boolean;
}

export interface NormalizedQuizStep {
  id: string;
  text: string;
  imageUrl?: string;
}

export interface RenderableQuizVisuals {
  promptImageUrl?: string;
  options: NormalizedQuizOption[];
  steps: NormalizedQuizStep[];
}

export function nonEmptyUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractItemImageUrl(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as {
    imageUrl?: unknown;
    image?: { url?: unknown } | null;
    visual?: { url?: unknown; asset_id?: unknown } | null;
  };
  return (
    nonEmptyUrl(obj.imageUrl) ??
    nonEmptyUrl(obj.visual?.url) ??
    nonEmptyUrl(obj.image?.url)
  );
}

function itemHasVisual(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  if (extractItemImageUrl(raw)) return true;
  const obj = raw as { visual?: { asset_id?: unknown } | null };
  return Boolean(
    obj.visual &&
      typeof obj.visual.asset_id === "string" &&
      obj.visual.asset_id.trim().length > 0
  );
}

export function extractPromptImageUrl(
  payload: Record<string, unknown> | null | undefined
): string | undefined {
  if (!payload) return undefined;
  const fromDirect =
    nonEmptyUrl(payload.promptImageUrl) ?? nonEmptyUrl(payload.imageUrl);
  if (fromDirect) return fromDirect;

  const rawPromptImg = payload.prompt_image;
  if (typeof rawPromptImg === "string") {
    return nonEmptyUrl(rawPromptImg);
  }
  if (rawPromptImg && typeof rawPromptImg === "object") {
    return nonEmptyUrl((rawPromptImg as { url?: unknown }).url);
  }
  return undefined;
}

function stripItemVisual<T>(raw: T): T {
  if (typeof raw === "string" || !raw || typeof raw !== "object") {
    return raw;
  }
  const clone = { ...(raw as Record<string, unknown>) };
  delete clone.imageUrl;
  delete clone.image;
  delete clone.visual;
  return clone as T;
}

/**
 * Enforce the strict mutual-exclusion quiz visual rule on a DB/UI quiz payload:
 * - If the question prompt has an image -> all options/steps MUST be text-only.
 * - If any option/step has an image -> the question prompt MUST be text-only.
 */
export function sanitizeQuizPayloadVisualRule(
  questionType: string,
  rawPayload: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(rawPayload ?? {}) };
  const isImageOptionType =
    questionType === "pilih_gambar" || next.variant === "pilih_gambar";
  const isTrueFalse = questionType === "benar_salah";

  const rawOptions = Array.isArray(next.options) ? next.options : undefined;
  const rawSteps = Array.isArray(next.steps) ? next.steps : undefined;

  const promptImageUrl = extractPromptImageUrl(next);
  const optionsHaveImages = Boolean(rawOptions?.some(itemHasVisual));
  const stepsHaveImages = Boolean(rawSteps?.some(itemHasVisual));

  if (isTrueFalse) {
    if (promptImageUrl) {
      next.promptImageUrl = promptImageUrl;
    } else {
      delete next.promptImageUrl;
      delete next.imageUrl;
      delete next.prompt_image;
    }
    if (rawOptions) {
      next.options = rawOptions.map(stripItemVisual);
    }
    if (rawSteps) {
      next.steps = rawSteps.map(stripItemVisual);
    }
    return next;
  }

  if (
    (isImageOptionType && optionsHaveImages) ||
    (!promptImageUrl && (optionsHaveImages || stepsHaveImages))
  ) {
    // Options or steps carry visuals -> question prompt MUST be text-only
    delete next.promptImageUrl;
    delete next.imageUrl;
    delete next.prompt_image;
    return next;
  }

  if (promptImageUrl) {
    // Prompt carries an image -> strip ALL visual/image/imageUrl from options and steps
    next.promptImageUrl = promptImageUrl;
    if (rawOptions) {
      next.options = rawOptions.map(stripItemVisual);
    }
    if (rawSteps) {
      next.steps = rawSteps.map(stripItemVisual);
    }
    return next;
  }

  delete next.promptImageUrl;
  delete next.imageUrl;
  delete next.prompt_image;
  return next;
}

/**
 * Normalize quiz payload for UI rendering while strictly enforcing visual mutual exclusion.
 */
export function resolveRenderableQuizVisuals(
  questionType: string,
  rawPayload: Record<string, unknown> | null | undefined
): RenderableQuizVisuals {
  const safePayload = sanitizeQuizPayloadVisualRule(questionType, rawPayload);
  const promptImageUrl = extractPromptImageUrl(safePayload);

  const rawOptions = Array.isArray(safePayload.options)
    ? safePayload.options
    : [];
  const options: NormalizedQuizOption[] = rawOptions.map(
    (rawOpt: unknown, idx: number) => {
      if (typeof rawOpt === "string") {
        const isCorrect =
          safePayload.answer !== undefined
            ? String(safePayload.answer).trim().toLowerCase() ===
              rawOpt.trim().toLowerCase()
            : idx === 0;
        return {
          id: `opt-${idx}`,
          text: rawOpt,
          correct: isCorrect,
        };
      }

      const opt = (rawOpt ?? {}) as {
        id?: string;
        text?: string;
        label?: string;
        imageUrl?: unknown;
        image?: { url?: unknown } | null;
        visual?: { url?: unknown } | null;
        correct?: boolean;
      };
      const text = opt.text ?? opt.label ?? `Pilihan ${idx + 1}`;
      const id = opt.id ?? `opt-${idx}`;
      const imageUrl = promptImageUrl ? undefined : extractItemImageUrl(opt);
      const isCorrect =
        typeof opt.correct === "boolean"
          ? opt.correct
          : safePayload.answer !== undefined
            ? String(safePayload.answer).trim().toLowerCase() ===
                text.trim().toLowerCase() ||
              String(safePayload.answer).trim().toLowerCase() ===
                id.toLowerCase()
            : idx === 0;

      return {
        id,
        text,
        imageUrl,
        correct: isCorrect,
      };
    }
  );

  const rawSteps = Array.isArray(safePayload.steps) ? safePayload.steps : [];
  const steps: NormalizedQuizStep[] = rawSteps.map(
    (rawStep: unknown, sIdx: number) => {
      if (typeof rawStep === "string") {
        return { id: `step-${sIdx}`, text: rawStep };
      }
      const st = (rawStep ?? {}) as {
        id?: string;
        text?: string;
        imageUrl?: unknown;
        image?: { url?: unknown } | null;
        visual?: { url?: unknown } | null;
      };
      return {
        id: st.id ?? `step-${sIdx}`,
        text: st.text ?? `Langkah ${sIdx + 1}`,
        imageUrl: promptImageUrl ? undefined : extractItemImageUrl(st),
      };
    }
  );

  return {
    promptImageUrl,
    options,
    steps,
  };
}
