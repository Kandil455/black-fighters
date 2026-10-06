/**
 * BLACK FIGHTERS V5 «الأطلس» — Page Credit Ledger & Cost Governance
 * Implements V4 Section 14 + V5 2.10:
 * - Tiers:
 *   - Free: 60 pages / month
 *   - Pro Fighter: 1,200 pages / month
 *   - Exam Pack: 400 pages one-time top-up
 * - Pre-start Estimator before deducting credits
 * - Atomic per-part deduction & automatic refund if a part fails permanently
 * - BYOK (Bring Your Own Key) escape hatch for power users
 */

export const CREDIT_TIERS = Object.freeze({
  free: {
    id: 'free',
    nameAr: 'الرتبة الأساسية (مجاني)',
    nameEn: 'FIELD INITIATE (FREE)',
    monthlyPageAllowance: 60,
    maxSingleDocumentPages: 60,
    includesCrossFamilyVerifier: false,
    includesOfflineZipExport: false,
  },
  pro: {
    id: 'pro',
    nameAr: 'مقاتل الأطلس (Pro)',
    nameEn: 'ATLAS FIGHTER PRO',
    monthlyPageAllowance: 1200,
    maxSingleDocumentPages: 1000,
    includesCrossFamilyVerifier: true,
    includesOfflineZipExport: true,
  },
  exam_pack: {
    id: 'exam_pack',
    nameAr: 'حزمة ليلة الامتحان (+400 صفحة)',
    nameEn: 'EXAM SURGE PACK (+400P)',
    oneTimePages: 400,
    maxSingleDocumentPages: 1000,
    includesCrossFamilyVerifier: true,
    includesOfflineZipExport: true,
  },
});

/**
 * Calculate exact page credit cost for a document ingest
 * OCR/Vision pages cost 1.5x page credit; text pages cost 1.0x; deduplicated pages cost 0
 */
export function calculateDocumentCreditCost({
  totalPages = 1,
  ocrPages = 0,
  deduplicatedPages = 0,
  byokActive = false,
} = {}) {
  if (byokActive) {
    return {
      billablePages: 0,
      textPages: Math.max(0, totalPages - ocrPages - deduplicatedPages),
      ocrPages,
      deduplicatedPages,
      totalCreditsRequired: 0,
      byokExempt: true,
    };
  }

  const effectiveTotal = Math.max(0, Number(totalPages) - Number(deduplicatedPages));
  const clampedOcr = Math.min(effectiveTotal, Math.max(0, Number(ocrPages)));
  const textPages = Math.max(0, effectiveTotal - clampedOcr);
  const totalCreditsRequired = Math.ceil(textPages * 1.0 + clampedOcr * 1.5);

  return {
    billablePages: effectiveTotal,
    textPages,
    ocrPages: clampedOcr,
    deduplicatedPages: Number(deduplicatedPages) || 0,
    totalCreditsRequired,
    byokExempt: false,
  };
}

/**
 * In-memory / serializable Credit Ledger with idempotent reservation, partial settlement, and refund
 */
export class PageCreditLedger {
  constructor({
    tier = 'free',
    remainingCredits = CREDIT_TIERS.free.monthlyPageAllowance,
    bonusCredits = 0,
    byokActive = false,
    transactions = [],
  } = {}) {
    this.tier = CREDIT_TIERS[tier] ? tier : 'free';
    this.remainingCredits = Number(remainingCredits) || 0;
    this.bonusCredits = Number(bonusCredits) || 0;
    this.byokActive = Boolean(byokActive);
    this.transactions = Array.isArray(transactions) ? [...transactions] : [];
  }

  get availableCredits() {
    return this.remainingCredits + this.bonusCredits;
  }

  canAfford(costObj) {
    if (this.byokActive) return { allowed: true, shortfall: 0 };
    const needed = Number(costObj?.totalCreditsRequired ?? costObj ?? 0);
    const avail = this.availableCredits;
    return {
      allowed: avail >= needed,
      shortfall: Math.max(0, needed - avail),
      availableCredits: avail,
      neededCredits: needed,
    };
  }

  reserveForJob(jobId, creditsRequired, metadata = {}) {
    if (!jobId) throw new Error('jobId is required for credit reservation');
    const existing = this.transactions.find((t) => t.jobId === jobId && t.type === 'reserve');
    if (existing) return existing;

    if (this.byokActive) {
      const tx = {
        id: `tx_${Date.now()}_${jobId}`,
        jobId,
        type: 'reserve',
        credits: 0,
        status: 'settled',
        byokExempt: true,
        metadata,
        createdAt: Date.now(),
      };
      this.transactions.push(tx);
      return tx;
    }

    const needed = Math.max(0, Math.ceil(Number(creditsRequired) || 0));
    if (this.availableCredits < needed) {
      throw new Error(`Insufficient page credits: need ${needed}, have ${this.availableCredits}`);
    }

    let fromMonthly = Math.min(this.remainingCredits, needed);
    let fromBonus = needed - fromMonthly;
    this.remainingCredits -= fromMonthly;
    this.bonusCredits -= fromBonus;

    const tx = {
      id: `tx_${Date.now()}_${jobId}`,
      jobId,
      type: 'reserve',
      credits: needed,
      fromMonthly,
      fromBonus,
      status: 'reserved',
      metadata,
      createdAt: Date.now(),
    };
    this.transactions.push(tx);
    return tx;
  }

  refundFailedPart(jobId, partCredits, reason = 'part_failed') {
    const refundAmount = Math.max(0, Math.ceil(Number(partCredits) || 0));
    if (refundAmount === 0 || this.byokActive) return null;

    this.remainingCredits += refundAmount;
    const refundTx = {
      id: `tx_refund_${Date.now()}_${jobId}`,
      jobId,
      type: 'refund',
      credits: refundAmount,
      reason,
      createdAt: Date.now(),
    };
    this.transactions.push(refundTx);
    return refundTx;
  }

  toJSON() {
    return {
      tier: this.tier,
      remainingCredits: this.remainingCredits,
      bonusCredits: this.bonusCredits,
      availableCredits: this.availableCredits,
      byokActive: this.byokActive,
      transactions: this.transactions,
    };
  }
}
