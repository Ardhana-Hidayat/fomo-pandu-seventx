/**
 * Image evaluation and scoring for sign candidates per Pack 2 Berkas 03 §2.
 */

export interface CandidateStats {
  width: number;
  height: number;
  touchesEdge?: boolean;
  sharpness: number; // e.g. Laplacian variance or edge gradient
  contrast: number; // 0 to 1
  marginBalance: number; // 0 to 1
  solidBackground?: boolean;
}

export interface ScoreResult {
  passed: boolean;
  score: number;
  rejectReason?: string;
}

export function evaluateCandidate(stats: CandidateStats): ScoreResult {
  // Hard filters
  if (stats.width < 200 || stats.height < 200) {
    return {
      passed: false,
      score: 0,
      rejectReason: `Dimensi terlalu kecil (${stats.width}x${stats.height}), minimal 200x200 px`,
    };
  }

  const aspectRatio = stats.width / stats.height;
  if (aspectRatio < 0.5 || aspectRatio > 2.0) {
    return {
      passed: false,
      score: 0,
      rejectReason: `Rasio aspek tidak wajar (${aspectRatio.toFixed(2)})`,
    };
  }

  if (stats.touchesEdge) {
    return {
      passed: false,
      score: 0,
      rejectReason: "Objek tangan menyentuh tepi bingkai gambar",
    };
  }

  if (stats.solidBackground === false) {
    return {
      passed: false,
      score: 0,
      rejectReason: "Latar belakang terlalu ramai (bukan latar polos)",
    };
  }

  // Soft scoring: 40% sharpness, 30% contrast, 30% margin balance
  const normSharpness = Math.min(Math.max(stats.sharpness / 100, 0), 1) * 40;
  const normContrast = Math.min(Math.max(stats.contrast, 0), 1) * 30;
  const normBalance = Math.min(Math.max(stats.marginBalance, 0), 1) * 30;

  const score = Math.round(normSharpness + normContrast + normBalance);

  return {
    passed: true,
    score: Math.max(score, 1),
  };
}
