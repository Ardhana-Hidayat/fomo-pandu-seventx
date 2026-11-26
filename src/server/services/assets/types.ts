export type AssetCategory =
  | "Bahasa Indonesia"
  | "Matematika"
  | "IPA"
  | "IPS"
  | "Pendidikan Pancasila"
  | "Seni dan Budaya"
  | "Pendidikan Jasmani"
  | "Kesehatan dan Kebersihan"
  | "Kehidupan Sehari-hari"
  | "Lingkungan"
  | "Hewan"
  | "Tumbuhan"
  | "Transportasi"
  | "Profesi"
  | "Makanan dan Minuman"
  | "Benda di Rumah"
  | "Benda di Sekolah"
  | "Kegiatan Sosial"
  | "Emosi dan Perilaku"
  | "Keselamatan Diri";

export const ALL_ASSET_CATEGORIES: readonly AssetCategory[] = [
  "Bahasa Indonesia",
  "Matematika",
  "IPA",
  "IPS",
  "Pendidikan Pancasila",
  "Seni dan Budaya",
  "Pendidikan Jasmani",
  "Kesehatan dan Kebersihan",
  "Kehidupan Sehari-hari",
  "Lingkungan",
  "Hewan",
  "Tumbuhan",
  "Transportasi",
  "Profesi",
  "Makanan dan Minuman",
  "Benda di Rumah",
  "Benda di Sekolah",
  "Kegiatan Sosial",
  "Emosi dan Perilaku",
  "Keselamatan Diri",
] as const;

export type AssetVisualType = "pictogram" | "illustration";

export interface AssetRecord {
  asset_id: string;
  filename: string;
  display_name: string;
  description: string;
  keywords_id: string[];
  keywords_en: string[];
  categories: AssetCategory[];
  concepts: string[];
  visual_type: AssetVisualType;
  source: string;
  license: string;
  attribution: string;
  file_path: string;
  available: boolean;
  arasaac_id?: number;
  canonical_key: string;
}

export interface SearchAssetsOptions {
  limit?: number;
  categories?: AssetCategory[];
  visualType?: AssetVisualType;
  minScore?: number;
  onlyAvailable?: boolean;
  deduplicateConcepts?: boolean;
}

export interface AssetSearchResult {
  asset: AssetRecord;
  score: number;
  matched_on: string[];
}

export interface CatalogStats {
  total_assets: number;
  available_assets: number;
  unavailable_assets: number;
  by_visual_type: Record<AssetVisualType, number>;
  by_source: Record<string, number>;
  by_category: Record<AssetCategory, number>;
  sibi_signs_count: number;
}

export interface CatalogValidationReport {
  valid: boolean;
  total_checked: number;
  missing_files: string[];
  invalid_records: Array<{ asset_id: string; reason: string }>;
  sibi_missing: string[];
}
