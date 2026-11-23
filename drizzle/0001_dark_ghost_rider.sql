CREATE TABLE "audio_clips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"option_key" text,
	"voice_key" text NOT NULL,
	"model" text NOT NULL,
	"text_hash" text NOT NULL,
	"asset_id" uuid,
	"duration_ms" integer,
	"status" text NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sign_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"system" text NOT NULL,
	"key" varchar(1) NOT NULL,
	"asset_id" uuid,
	"status" text DEFAULT 'source' NOT NULL,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson_cards" ADD COLUMN "sign_override" text;--> statement-breakpoint
ALTER TABLE "lesson_cards" ADD COLUMN "voice_override" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "sign_system" text DEFAULT 'SIBI' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "sign_scope" text DEFAULT 'key_terms' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "sign_speed" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "voice_key" text DEFAULT 'A' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "voice_speed" real DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "audio_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD COLUMN "key_terms" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD COLUMN "sign_override" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "voice_key" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "audio_mode" text;--> statement-breakpoint
ALTER TABLE "audio_clips" ADD CONSTRAINT "audio_clips_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_clips" ADD CONSTRAINT "audio_clips_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_overrides" ADD CONSTRAINT "sign_overrides_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sign_overrides" ADD CONSTRAINT "sign_overrides_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audio_clips_lesson_target_idx" ON "audio_clips" USING btree ("lesson_id","target_type");--> statement-breakpoint
CREATE INDEX "audio_clips_text_hash_idx" ON "audio_clips" USING btree ("text_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "audio_clips_unique_target_idx" ON "audio_clips" USING btree ("lesson_id","target_type",coalesce("target_id", '00000000-0000-0000-0000-000000000000'::uuid),coalesce("option_key", ''),"voice_key");--> statement-breakpoint
CREATE INDEX "sign_overrides_teacher_system_idx" ON "sign_overrides" USING btree ("teacher_id","system");--> statement-breakpoint
CREATE UNIQUE INDEX "sign_overrides_teacher_system_key_idx" ON "sign_overrides" USING btree ("teacher_id","system","key");