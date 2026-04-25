/**
 * ═══════════════════════════════════════════════════════════════
 *  Zinc — High Precision Financial Math Engine
 *  استخدم الـ `money` object لكل العمليات الحسابية المالية
 *  استخدم الـ `pricing` object لحسابات التسعير والخصم والربح
 *  استخدم الـ `tax` object لحسابات الضريبة (Exclusive / Inclusive)
 * ═══════════════════════════════════════════════════════════════
 *
 *  المبدأ: كل العمليات بتتحول لـ integers (قروش) قبل الحساب
 *  وبترجع جنيهات بعده — مفيش float بيعدي الـ boundary خالص.
 *
 *  قواعد الاستخدام:
 *  - multiply: دايماً بـ factorInt + scale (مش float مباشر)
 *              مثال: 14% → multiply(price, 14, 2)  مش multiply(price, 0.14)
 *  - divide:   بس على عدد وحدات صحيحة (÷ 3 شرايط، ÷ 12 حبة)
 *              النسب المئوية يتعامل معاها بـ multiply
 *  - allocate: لتوزيع مبلغ على وحدات من غير ما قرش يضيع
 */

// ─────────────────────────────────────────────
//  Core Engine
// ─────────────────────────────────────────────

export const money = {
  /**
   * حوّل جنيهات لقروش (integer)
   * @example toSmallestUnit(10.5) → 1050
   */
  toSmallestUnit: (amount: number): number => Math.round(amount * 100),

  /**
   * حوّل قروش لجنيهات
   * @example fromSmallestUnit(1050) → 10.5
   */
  fromSmallestUnit: (cents: number): number => cents / 100,

  /**
   * جمع دقيق
   * @example add(0.1, 0.2) → 0.30 (مش 0.30000000000000004)
   */
  add: (a: number, b: number): number =>
    money.fromSmallestUnit(money.toSmallestUnit(a) + money.toSmallestUnit(b)),

  /**
   * طرح دقيق
   * @example subtract(10, 3.5) → 6.50
   */
  subtract: (a: number, b: number): number =>
    money.fromSmallestUnit(money.toSmallestUnit(a) - money.toSmallestUnit(b)),

  /**
   * ضرب دقيق — المعامل لازم يكون integer + scale
   *
   * @param amount     - القيمة بالجنيه
   * @param factorInt  - المعامل كـ integer (مش float!)
   * @param scale      - عدد الخانات العشرية في factorInt
   *
   * @example multiply(100, 14, 2)  → 14.00  (100 × 14%)
   * @example multiply(50,  15, 2)  → 7.50   (50  × 15%)
   * @example multiply(35,   3, 0)  → 105.00 (35  × 3 علب)
   * @example multiply(7,  333, 4)  → 0.23   (7   × 3.33%)
   */
  multiply: (amount: number, factorInt: number, scale: number): number => {
    const amountCents = money.toSmallestUnit(amount);
    const resultCents = Math.round(
      (amountCents * factorInt) / Math.pow(10, scale)
    );
    return money.fromSmallestUnit(resultCents);
  },

  /**
   * قسمة على عدد وحدات صحيح فقط
   * للنسب المئوية استخدم multiply
   *
   * @param amount   - القيمة بالجنيه
   * @param divisor  - عدد الوحدات (integer)
   *
   * @example divide(35, 3) → 11.67  (سعر الشريط من علبة 3 شرايط)
   * @example divide(60, 4) → 15.00
   */
  divide: (amount: number, divisor: number): number => {
    if (divisor === 0) return 0;
    const amountCents = money.toSmallestUnit(amount);
    return money.fromSmallestUnit(Math.round(amountCents / divisor));
  },

  /**
   * توزيع مبلغ على وحدات من غير ما قرش يضيع
   * الفرق الزيادة بيتوزع على أول الوحدات
   *
   * @param amount  - المبلغ الكلي بالجنيه
   * @param ratios  - نسب التوزيع (أعداد صحيحة)
   *
   * @example allocate(35, [1, 1, 1]) → [11.67, 11.67, 11.66]
   * @example allocate(10, [1, 2])    → [3.34, 6.66]
   */
  allocate: (amount: number, ratios: number[]): number[] => {
    const totalCents = money.toSmallestUnit(amount);
    const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
    let remainder = totalCents;

    const results = ratios.map((ratio) => {
      const share = Math.floor((totalCents * ratio) / totalRatio);
      remainder -= share;
      return share;
    });

    // وزّع القروش الزيادة واحد واحد على أول الوحدات
    for (let i = 0; remainder > 0; i++) {
      results[i % results.length]++;
      remainder--;
    }

    return results.map(money.fromSmallestUnit);
  },

  // ─── Comparisons ───────────────────────────

  /** مساواة آمنة */
  isEqual: (a: number, b: number): boolean =>
    Math.abs(money.toSmallestUnit(a) - money.toSmallestUnit(b)) < 1,

  /** أكبر من أو يساوي */
  isGte: (a: number, b: number): boolean =>
    money.toSmallestUnit(a) >= money.toSmallestUnit(b),

  /** أصغر من أو يساوي */
  isLte: (a: number, b: number): boolean =>
    money.toSmallestUnit(a) <= money.toSmallestUnit(b),

  /** أكبر من */
  isGt: (a: number, b: number): boolean =>
    money.toSmallestUnit(a) > money.toSmallestUnit(b),

  /** أصغر من */
  isLt: (a: number, b: number): boolean =>
    money.toSmallestUnit(a) < money.toSmallestUnit(b),
};

// ─────────────────────────────────────────────
//  Pricing Helpers — حسابات التسعير في الصيدلية
// ─────────────────────────────────────────────

export const pricing = {
  /**
   * قيمة الخصم بنسبة مئوية
   * @example discountAmount(35, 10) → 3.50  (خصم 10%)
   * @example discountAmount(35, 33.33) → 11.67
   */
  discountAmount: (price: number, pct: number): number =>
    money.multiply(price, Math.round(pct * 100), 4),

  /**
   * السعر بعد خصم نسبة مئوية
   * @example afterDiscount(35, 10) → 31.50
   */
  afterDiscount: (price: number, pct: number): number =>
    money.subtract(price, pricing.discountAmount(price, pct)),

  /**
   * Markup — هامش ربح محسوب على سعر التكلفة
   * الأشيع في الصيدليات
   *
   * @example markupPrice(35, 20) → 42.00  (ربح 20% فوق التكلفة)
   * @example markupPrice(35, 50) → 52.50
   */
  markupPrice: (cost: number, pct: number): number =>
    money.add(cost, money.multiply(cost, Math.round(pct * 100), 4)),

  /**
   * قيمة الربح من Markup
   * @example markupAmount(35, 20) → 7.00
   */
  markupAmount: (cost: number, pct: number): number =>
    money.multiply(cost, Math.round(pct * 100), 4),

  /**
   * Margin — هامش ربح محسوب من سعر البيع
   * sellPrice = cost ÷ (1 - margin%)
   *
   * @example marginPrice(35, 20) → 43.75  (هامش 20% من البيع)
   * @example marginPrice(35, 30) → 50.00
   */
  marginPrice: (cost: number, pct: number): number => {
    if (pct >= 100) return 0; // هامش 100% = مجاني — مش منطقي
    // cost × 100 ÷ (100 - pct)  — كل حاجة integers
    const numerator = money.multiply(cost, 100, 0);
    return money.divide(numerator, 100 - pct);
  },

  /**
   * احسب نسبة الربح الفعلية (Markup%) من سعري الشراء والبيع
   * @example actualMarkup(35, 42) → 20.00  (%)
   */
  actualMarkup: (cost: number, sellPrice: number): number => {
    if (cost === 0) return 0;
    const profitCents =
      money.toSmallestUnit(sellPrice) - money.toSmallestUnit(cost);
    return money.fromSmallestUnit(
      Math.round((profitCents / money.toSmallestUnit(cost)) * 10000)
    );
  },

  /**
   * احسب نسبة الهامش الفعلية (Margin%) من سعري الشراء والبيع
   * @example actualMargin(35, 43.75) → 20.00  (%)
   */
  actualMargin: (cost: number, sellPrice: number): number => {
    if (sellPrice === 0) return 0;
    const profitCents =
      money.toSmallestUnit(sellPrice) - money.toSmallestUnit(cost);
    return money.fromSmallestUnit(
      Math.round((profitCents / money.toSmallestUnit(sellPrice)) * 10000)
    );
  },

  /**
   * إجمالي سطر في الفاتورة (سعر × كمية − خصم%)
   * @example lineTotal(35, 3, 10) → 94.50  (35 × 3 مع خصم 10%)
   */
  lineTotal: (
    unitPrice: number,
    quantity: number,
    discountPct: number = 0
  ): number => {
    const gross = money.multiply(unitPrice, quantity, 0);
    return discountPct > 0 ? pricing.afterDiscount(gross, discountPct) : gross;
  },
};

// ─────────────────────────────────────────────
//  Tax Helpers — حسابات الضريبة
// ─────────────────────────────────────────────
//
//  Exclusive: السعر لا يشمل الضريبة — بتتضاف فوقيه
//    سعر الدواء: 100 ج + ضريبة 14% = 114 ج للعميل
//
//  Inclusive: السعر شامل الضريبة — مطبوع على العلبة
//    سعر الدواء: 114 ج (الضريبة جوّاه = 14 ج)
//
//  الأدوية المصرية: Inclusive بالتعريف (السعر مطبوع)
//  فواتير المستشفيات/الشركات: غالباً Exclusive

export const tax = {
  // ─── Exclusive ─────────────────────────────

  /**
   * قيمة الضريبة على سعر لا يشملها
   * @example exclusiveAmount(100, 14) → 14.00
   * @example exclusiveAmount(35.50, 14) → 4.97
   */
  exclusiveAmount: (priceBeforeTax: number, taxPct: number): number =>
    money.multiply(priceBeforeTax, Math.round(taxPct * 100), 4),

  /**
   * السعر الكلي بعد إضافة الضريبة
   * @example exclusiveTotal(100, 14) → 114.00
   * @example exclusiveTotal(35.50, 14) → 40.47
   */
  exclusiveTotal: (priceBeforeTax: number, taxPct: number): number =>
    money.add(priceBeforeTax, tax.exclusiveAmount(priceBeforeTax, taxPct)),

  // ─── Inclusive ─────────────────────────────

  /**
   * استخرج قيمة الضريبة من سعر شامل للضريبة
   * المعادلة: taxAmount = price × rate / (1 + rate)
   * بالـ integers: (priceCents × taxPct) / (100 + taxPct)
   *
   * @example inclusiveAmount(114, 14) → 14.00
   * @example inclusiveAmount(35, 14)  → 4.30
   */
  inclusiveAmount: (priceWithTax: number, taxPct: number): number => {
    const priceCents = money.toSmallestUnit(priceWithTax);
    const taxCents = Math.round((priceCents * taxPct) / (100 + taxPct));
    return money.fromSmallestUnit(taxCents);
  },

  /**
   * استخرج السعر قبل الضريبة من سعر شامل
   * @example inclusiveBase(114, 14) → 100.00
   * @example inclusiveBase(35, 14)  → 30.70
   */
  inclusiveBase: (priceWithTax: number, taxPct: number): number =>
    money.subtract(priceWithTax, tax.inclusiveAmount(priceWithTax, taxPct)),

  // ─── Invoice Helpers ───────────────────────

  /**
   * احسب ضريبة فاتورة كاملة بعد الخصم
   * الترتيب الصح: الخصم الأول، الضريبة على الباقي
   *
   * @param subtotal   - مجموع السطور قبل الضريبة
   * @param discountPct - نسبة خصم على الإجمالي (اختياري)
   * @param taxPct     - نسبة الضريبة
   * @param mode       - 'exclusive' أو 'inclusive'
   *
   * @example
   * invoiceTax(1000, 10, 14, 'exclusive')
   * → { base: 900, taxAmount: 126, total: 1026 }
   *
   * @example
   * invoiceTax(1140, 0, 14, 'inclusive')
   * → { base: 1000, taxAmount: 140, total: 1140 }
   */
  invoiceTax: (
    subtotal: number,
    discountPct: number = 0,
    taxPct: number,
    mode: "exclusive" | "inclusive"
  ): { base: number; taxAmount: number; total: number } => {
    // 1. طبّق الخصم الأول
    const afterDiscount =
      discountPct > 0 ? pricing.afterDiscount(subtotal, discountPct) : subtotal;

    if (mode === "exclusive") {
      const taxAmount = tax.exclusiveAmount(afterDiscount, taxPct);
      const total = money.add(afterDiscount, taxAmount);
      return { base: afterDiscount, taxAmount, total };
    } else {
      // inclusive: الـ subtotal نفسه شامل الضريبة
      const taxAmount = tax.inclusiveAmount(afterDiscount, taxPct);
      const base = money.subtract(afterDiscount, taxAmount);
      return { base, taxAmount, total: afterDiscount };
    }
  },

  /**
   * ضريبة متعددة النسب على نفس الفاتورة
   * مثال: بعض الأدوية 0%، ومستلزمات طبية 14%
   *
   * @example
   * multiRate([
   *   { amount: 500, taxPct: 0 },
   *   { amount: 300, taxPct: 14 },
   * ], 'exclusive')
   * → { base: 800, taxAmount: 42, total: 842 }
   */
  multiRate: (
    lines: Array<{ amount: number; taxPct: number }>,
    mode: "exclusive" | "inclusive"
  ): { base: number; taxAmount: number; total: number } => {
    let base = 0;
    let taxAmount = 0;

    for (const line of lines) {
      if (mode === "exclusive") {
        const lineTax = tax.exclusiveAmount(line.amount, line.taxPct);
        base = money.add(base, line.amount);
        taxAmount = money.add(taxAmount, lineTax);
      } else {
        const lineTax = tax.inclusiveAmount(line.amount, line.taxPct);
        const lineBase = money.subtract(line.amount, lineTax);
        base = money.add(base, lineBase);
        taxAmount = money.add(taxAmount, lineTax);
      }
    }

    const total = money.add(base, taxAmount);
    return { base, taxAmount, total };
  },
};
