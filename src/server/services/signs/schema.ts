import { z } from "zod";

const SignOriginSchema = z.object({
  sourceId: z.string(),
  doi: z.string(),
  originalFile: z.string(),
  sha256: z.string(),
  transform: z.string(),
});

export const SignItemSchema = z.object({
  system: z.enum(["SIBI", "BISINDO"]),
  kind: z.literal("letter").default("letter"),
  key: z.string().length(1).regex(/^[A-Z]$/),
  type: z.enum(["image", "video"]).default("image"),
  src: z.string(),
  alt: z.string(),
  motion: z.boolean().default(false),
  status: z.enum(["verified", "source", "draft", "missing"]).default("source"),
  origin: SignOriginSchema.optional(),
  reference: z.string().optional(),
  verifiedBy: z.string().nullable().optional(),
  verifiedAt: z.string().nullable().optional(),
});

export type SignItem = z.infer<typeof SignItemSchema>;

export const SignsManifestV2Schema = z.object({
  version: z.literal(2),
  generated_by: z.string().optional(),
  note: z.string().optional(),
  items: z.array(SignItemSchema),
  status_meaning: z.record(z.string()).optional(),
});

export type SignsManifestV2 = z.infer<typeof SignsManifestV2Schema>;
