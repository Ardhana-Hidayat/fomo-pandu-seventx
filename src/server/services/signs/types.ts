export type SignSystem = "SIBI" | "BISINDO";
export type SignStatus = "verified" | "source" | "draft" | "missing";
export type SignType = "image" | "video" | "svg";
export type SignKind = "letter" | "word";

export interface SignItem {
  system: SignSystem;
  kind: SignKind;
  key: string;
  type: SignType;
  src: string;
  alt: string;
  source?: string;
  license?: string;
  reference: string;
  status: SignStatus;
  motion?: boolean;
  origin?: unknown;
  verifiedBy: string | null;
  verifiedAt: string | null;
}

export interface SignsManifest {
  version: number;
  note?: string;
  items: SignItem[];
}
