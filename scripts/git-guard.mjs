#!/usr/bin/env node
/**
 * Penjaga Git InkluDidik. Tanpa dependensi.
 *
 * Pemakaian:
 *   node scripts/git-guard.mjs staged            # untuk pre-commit: berkas yang di-stage
 *   node scripts/git-guard.mjs tracked           # untuk CI dan pre-push: semua berkas terlacak
 *   node scripts/git-guard.mjs commit-msg <file> # untuk commit-msg: format pesan
 *
 * Kode keluar 1 bila ada pelanggaran. Ini jaring pengaman tambahan, bukan pengganti gitleaks.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync, existsSync } from "node:fs";

export const MAX_BYTES = 1_000_000;

/** Berkas yang tidak boleh pernah masuk repo. `.env.example` dikecualikan secara eksplisit. */
export const FORBIDDEN_PATHS = [
  /^docs\/update-pack\//,
  /^\.update-pack\//,
  /^inkludidik-update-pack\//,
  /^CONTEXT\.md$/,
  /^docs\/update-plan\.md$/,
  /^docs\/izin\//,
  /^\.env(\..+)?$/,
  /^\.data\//,
  /^node_modules\//,
  /^\.next\//,
  /^\.vercel\//,
  /^coverage\//,
  /^playwright-report\//,
  /^test-results\//,
  /^\.claude\//,
  /^\.agent\//,
  /\.zip$/i,
  /\.(pem|key|p12|pfx)$/i,
  /(^|\/)id_(rsa|ed25519)(\.pub)?$/,
  /\.(sqlite3?|db)$/i,
];
const ALLOWED_PATHS = [/^\.env\.example$/];

export const SECRET_PATTERNS = [
  { name: "kunci API Google", re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "token JWT", re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\./ },
  { name: "URL database berisi sandi", re: /postgres(ql)?:\/\/[^:\s/]+:[^@\s]+@/ },
  { name: "kunci rahasia Supabase", re: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: "penugasan rahasia", re: /(api[_-]?key|secret|token|password|passwd)\s*[:=]\s*['"][^'"\s]{12,}['"]/i },
];

const COMMIT_TYPES = "feat|fix|refactor|perf|test|docs|chore|build|ci|style|revert";
const SUBJECT_RE = new RegExp(`^(${COMMIT_TYPES})(\\([a-z0-9-]+\\))?!?: \\S.{0,70}$`);
const NEEDS_REFS = /^(feat|fix|refactor|perf)/;
const REFS_RE = /^Refs: S\d-\d{2}(, S\d-\d{2})*$/m;

export function checkPaths(paths) {
  return paths
    .filter((p) => !ALLOWED_PATHS.some((a) => a.test(p)))
    .filter((p) => FORBIDDEN_PATHS.some((f) => f.test(p)))
    .map((p) => `Berkas terlarang masuk repo: ${p}`);
}

export function checkSecrets(addedLines) {
  const out = [];
  for (const line of addedLines) {
    for (const { name, re } of SECRET_PATTERNS) {
      if (re.test(line)) out.push(`Dugaan ${name}: ${line.trim().slice(0, 60)}...`);
    }
  }
  return out;
}

export function checkCommitMessage(message) {
  const lines = message.split("\n");
  const subject = (lines[0] ?? "").trim();
  if (/^(Merge |Revert ")/.test(subject)) return [];
  const problems = [];
  if (!SUBJECT_RE.test(subject)) {
    problems.push(`Baris pertama harus 'tipe(lingkup): ringkasan' (maks. 72 karakter). Tipe: ${COMMIT_TYPES}`);
  }
  if (NEEDS_REFS.test(subject) && !REFS_RE.test(message)) {
    problems.push("Tambahkan baris 'Refs: S1-04' (ID cerita dari docs/backlog.md).");
  }
  if (lines[1] !== undefined && lines[1].trim() !== "") problems.push("Baris kedua harus kosong.");
  return problems;
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const splitLines = (s) => s.split("\n").filter(Boolean);

function checkSizes(paths) {
  return paths
    .filter((p) => existsSync(p))
    .filter((p) => statSync(p).size > MAX_BYTES)
    .map((p) => `Berkas terlalu besar (>1 MB): ${p}`);
}

function run(mode, arg) {
  if (mode === "commit-msg") return checkCommitMessage(readFileSync(arg, "utf8"));
  if (mode === "staged") {
    const paths = splitLines(git("diff", "--cached", "--name-only", "--diff-filter=ACMR"));
    const added = splitLines(git("diff", "--cached", "-U0", "--no-color"))
      .filter((l) => l.startsWith("+") && !l.startsWith("+++"));
    return [...checkPaths(paths), ...checkSizes(paths), ...checkSecrets(added)];
  }
  if (mode === "tracked") {
    const paths = splitLines(git("ls-files"));
    return [...checkPaths(paths), ...checkSizes(paths)];
  }
  return [`Mode tidak dikenal: ${mode}`];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = run(process.argv[2], process.argv[3]);
  if (problems.length) {
    console.error(problems.map((p) => `- ${p}`).join("\n"));
    process.exit(1);
  }
}
