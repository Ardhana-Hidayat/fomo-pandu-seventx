import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  bigint,
  bigserial,
  real,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

export interface TeacherSettings {
  theme?: string;
  fontSize?: string;
  voiceName?: string;
  speechRate?: number;
  highContrast?: boolean;
  dyslexicFont?: boolean;
  reducedMotion?: boolean;
}

export interface ChannelSettings {
  text: boolean;
  audio: boolean;
  image: boolean;
  sign: boolean;
}

export interface LessonSettings {
  channels: ChannelSettings;
  sign_system: "SIBI" | "BISINDO" | string;
  sign_scope: string;
  sync_mode: string;
  speed: { speech: number; sign: number };
  allow_student_override: boolean;
  auto_advance: boolean;
}

export interface QuizQuestionPayload {
  options?: Array<{
    id: string;
    text: string;
    image?: { keyword_en?: string; alt?: string };
    correct: boolean;
  }>;
  steps?: Array<{
    id: string;
    text: string;
    image?: { keyword_en?: string; alt?: string };
  }>;
  answer?: boolean;
  sign_word?: string;
  prompt_image?: { keyword_en?: string; alt?: string };
  [key: string]: unknown;
}

export const teachers = pgTable("teachers", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique(),
  displayName: text("display_name").notNull(),
  schoolName: text("school_name"),
  authProvider: text("auth_provider").notNull().default("demo"),
  settings: jsonb("settings").$type<TeacherSettings>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const classrooms = pgTable(
  "classrooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    level: text("level").notNull().default("sdlb"),
    joinCode: varchar("join_code", { length: 6 }).notNull(),
    rosterOnly: boolean("roster_only").notNull().default(false),
    defaultChannels: jsonb("default_channels").$type<ChannelSettings>(),
    defaultSignSystem: text("default_sign_system").notNull().default("SIBI"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("classrooms_active_join_code_idx")
      .on(table.joinCode)
      .where(sql`${table.archivedAt} IS NULL`),
  ]
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    classroomId: uuid("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    needsPreset: text("needs_preset").notNull().default("campuran"),
    settingsOverride: jsonb("settings_override").$type<Record<string, unknown>>(),
    mergedInto: uuid("merged_into"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("students_classroom_name_idx").on(
      table.classroomId,
      sql`lower(${table.displayName})`
    ),
  ]
);

export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind").notNull(),
  storageKey: text("storage_key").notNull(),
  mime: text("mime").notNull(),
  bytes: integer("bytes").notNull(),
  keyword: text("keyword"),
  alt: text("alt"),
  source: text("source").notNull().default("system"),
  license: text("license").notNull().default("CC-BY-SA"),
  attribution: text("attribution").notNull().default("ARASAAC / InkluDidik"),
  verified: boolean("verified").notNull().default(false),
  ownerTeacherId: uuid("owner_teacher_id").references(() => teachers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const lessons = pgTable("lessons", {
  id: uuid("id").defaultRandom().primaryKey(),
  teacherId: uuid("teacher_id")
    .notNull()
    .references(() => teachers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  level: text("level").notNull().default("sdlb"),
  slug: text("slug"),
  sourceType: text("source_type").notNull().default("topik"),
  sourceTextHash: text("source_text_hash"),
  sourceAssetId: uuid("source_asset_id").references(() => assets.id, {
    onDelete: "set null",
  }),
  generatedBy: text("generated_by").notNull().default("manual"),
  status: text("status").notNull().default("draft"),
  exerciseType: text("exercise_type").notNull().default("both"),
  optionCount: integer("option_count").notNull().default(3),
  showTextHint: boolean("show_text_hint").notNull().default(true),
  settings: jsonb("settings").$type<LessonSettings>(),
  options: jsonb("options").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const lessonCards = pgTable(
  "lesson_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    keyTerms: text("key_terms").array().notNull().default([]),
    cardType: text("card_type").notNull().default("instruction"),
    imageSource: text("image_source").notNull().default("pictogram"),
    audioSource: text("audio_source").notNull().default("none"),
    imageAssetId: uuid("image_asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    imageAlt: text("image_alt"),
    audioAssetId: uuid("audio_asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("lesson_cards_lesson_position_idx").on(
      table.lessonId,
      table.position
    ),
  ]
);

export const quizQuestions = pgTable("quiz_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  type: text("type").notNull(),
  prompt: text("prompt").notNull(),
  payload: jsonb("payload").$type<QuizQuestionPayload>().notNull(),
  linkedCardId: uuid("linked_card_id").references(() => lessonCards.id, {
    onDelete: "set null",
  }),
  explanation: text("explanation"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const publications = pgTable(
  "publications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    classroomId: uuid("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    shareCode: varchar("share_code", { length: 8 }).unique(),
    visible: boolean("visible").notNull().default(true),
    publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("publications_lesson_classroom_idx").on(
      table.lessonId,
      table.classroomId
    ),
    index("publications_classroom_visible_idx").on(
      table.classroomId,
      table.visible
    ),
  ]
);

export const studentOverrides = pgTable("student_overrides", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicationId: uuid("publication_id")
    .notNull()
    .references(() => publications.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  channels: jsonb("channels").$type<Record<string, boolean>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    publicationId: uuid("publication_id").references(() => publications.id, {
      onDelete: "set null",
    }),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    device: text("device").notNull().default("ponsel"),
    channelsOn: text("channels_on").array().notNull().default([]),
    signSystem: text("sign_system").default("SIBI"),
    speechRate: real("speech_rate").default(1.0),
    signSpeed: real("sign_speed").default(1.0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sessions_student_lesson_idx").on(table.studentId, table.lessonId),
  ]
);

export const cardEvents = pgTable(
  "card_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventId: uuid("event_id").unique(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    cardId: uuid("card_id")
      .notNull()
      .references(() => lessonCards.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    atMs: integer("at_ms").notNull(),
    dwellMs: integer("dwell_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("card_events_session_idx").on(table.sessionId),
  ]
);

export const questionAttempts = pgTable(
  "question_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventId: uuid("event_id").unique(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    attemptNo: integer("attempt_no").notNull().default(1),
    chosen: jsonb("chosen").$type<Record<string, unknown>>(),
    isCorrect: boolean("is_correct").notNull(),
    hintUsed: boolean("hint_used").notNull().default(false),
    msToAnswer: integer("ms_to_answer").notNull().default(0),
    channelsOn: text("channels_on").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("question_attempts_session_question_idx").on(
      table.sessionId,
      table.questionId
    ),
  ]
);

export const recommendations = pgTable("recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => lessons.id, { onDelete: "cascade" }),
  ruleId: text("rule_id").notNull(),
  priority: text("priority").notNull(),
  evidence: jsonb("evidence").$type<Record<string, unknown>>(),
  message: text("message").notNull(),
  status: text("status").notNull().default("baru"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const appSessions = pgTable("app_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  role: text("role").notNull(),
  teacherId: uuid("teacher_id").references(() => teachers.id, {
    onDelete: "cascade",
  }),
  studentId: uuid("student_id").references(() => students.id, {
    onDelete: "cascade",
  }),
  classroomId: uuid("classroom_id").references(() => classrooms.id, {
    onDelete: "cascade",
  }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const generationLog = pgTable("generation_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  teacherId: uuid("teacher_id").references(() => teachers.id, {
    onDelete: "set null",
  }),
  inputHash: text("input_hash").notNull(),
  status: text("status").notNull(),
  source: text("source").notNull(),
  ms: integer("ms").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: bigint("window_start", { mode: "number" }).notNull(),
    count: integer("count").notNull().default(1),
  },
  (table) => [
    primaryKey({ columns: [table.key, table.windowStart] }),
  ]
);

export const syncEvents = pgTable("sync_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").references(() => sessions.id, {
    onDelete: "cascade",
  }),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  clientTimestamp: bigint("client_timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;
export type Classroom = typeof classrooms.$inferSelect;
export type NewClassroom = typeof classrooms.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type LessonCard = typeof lessonCards.$inferSelect;
export type NewLessonCard = typeof lessonCards.$inferInsert;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type NewQuizQuestion = typeof quizQuestions.$inferInsert;
export type Publication = typeof publications.$inferSelect;
export type NewPublication = typeof publications.$inferInsert;
export type StudentOverride = typeof studentOverrides.$inferSelect;
export type NewStudentOverride = typeof studentOverrides.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type CardEvent = typeof cardEvents.$inferSelect;
export type NewCardEvent = typeof cardEvents.$inferInsert;
export type QuestionAttempt = typeof questionAttempts.$inferSelect;
export type NewQuestionAttempt = typeof questionAttempts.$inferInsert;
export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;
export type AppSession = typeof appSessions.$inferSelect;
export type NewAppSession = typeof appSessions.$inferInsert;
export type GenerationLog = typeof generationLog.$inferSelect;
export type NewGenerationLog = typeof generationLog.$inferInsert;
export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;
export type SyncEvent = typeof syncEvents.$inferSelect;
export type NewSyncEvent = typeof syncEvents.$inferInsert;
