CREATE TABLE "catalog_version" (
	"id" text PRIMARY KEY NOT NULL,
	"hash" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visual_concepts" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"label_norm" text NOT NULL,
	"synonyms" text[] DEFAULT '{}' NOT NULL,
	"label_en" text,
	"domains" text[] DEFAULT '{}' NOT NULL,
	"group_id" text,
	"kind" text,
	"popularity" real DEFAULT 0 NOT NULL,
	"asset_id" uuid,
	"alt_asset_ids" uuid[] DEFAULT '{}' NOT NULL,
	"alt_text" text,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text DEFAULT 'arasaac' NOT NULL,
	"source_ref" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visual_gaps" (
	"term" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"last_lesson_id" uuid,
	"subject" text,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "attribution" SET DEFAULT 'ARASAAC / PanduIn';--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "sha256" text;--> statement-breakpoint
ALTER TABLE "visual_concepts" ADD CONSTRAINT "visual_concepts_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_concepts" ADD CONSTRAINT "visual_concepts_uploaded_by_teachers_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visual_gaps" ADD CONSTRAINT "visual_gaps_last_lesson_id_lessons_id_fk" FOREIGN KEY ("last_lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "visual_concepts_active_label_norm_idx" ON "visual_concepts" USING btree ("label_norm") WHERE "visual_concepts"."status" <> 'hidden';--> statement-breakpoint
CREATE INDEX "visual_concepts_status_idx" ON "visual_concepts" USING btree ("status");