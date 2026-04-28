import { GoogleGenAI } from '@google/genai';
import { money } from '../utils/money';

/**
 * Gemini Service - Hybrid Client
 * - DEV: Uses direct API key from .env (VITE_GEMINI_API_KEY)
 * - PROD: Uses Netlify serverless function to hide API key
 */

export interface EmployeePerformanceData {
  employeeName: string;
  period: string;
  totalSales: number;
  netProfit: number;
  profitMargin: number;
  itemsSold: number;
  transactionCount: number;
  topProduct?: string;
  salesTrend?: number;
  profitTrend?: number;
}

const callAI = async (action: string, data: any, language: 'AR' | 'EN' = 'EN'): Promise<string> => {
  if (import.meta.env.DEV) {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is missing in .env');

      const ai = new GoogleGenAI({ apiKey });

      let prompt = '';

      if (action === 'analyzeEmployeePerformance') {
        const perfData = data as EmployeePerformanceData & { mode?: 'short' | 'detailed' };
        const isArabic = language === 'AR';
        const isShort = perfData.mode === 'short';

        if (isShort) {
          prompt = isArabic
            ? `أنت مدير صيدلية متمرس بخبرة 15+ سنة في تحليل الأداء المالي.

البيانات المالية:
- الموظف: ${perfData.employeeName}
- الفترة: ${perfData.period}
- إجمالي المبيعات: ${money.divide(perfData.totalSales, 100)} جنيه
- صافي الربح: ${money.divide(perfData.netProfit, 100)} جنيه
- هامش الربح: ${perfData.profitMargin}%
- عدد الفواتير: ${perfData.transactionCount}
- القطع المباعة: ${perfData.itemsSold}
- المنتج الأعلى مبيعاً: ${perfData.topProduct || 'غير محدد'}

المطلوب: جملة تقييمية واحدة (15-25 كلمة) تركز على أهم مؤشر أداء بناءً على:
1. إذا كان هامش الربح أقل من 15% → ركز على ضعف الربحية
2. إذا كان متوسط الفاتورة (المبيعات ÷ الفواتير) أقل من 100 جنيه → ركز على صغر حجم السلة
3. إذا كان معدل القطع لكل فاتورة أقل من 3 → ركز على ضعف البيع الإضافي
4. غير ذلك → قيّم الأداء الإجمالي

التنسيق: نص عادي، بدون رموز، بدون نجوم، لغة مهنية مباشرة. لا تذكر اسم الموظف في الجملة.`
            : `You are a seasoned pharmacy manager with 15+ years in financial performance analysis.

Financial Data:
- Employee: ${perfData.employeeName}
- Period: ${perfData.period}
- Total Sales: ${money.divide(perfData.totalSales, 100)} EGP
- Net Profit: ${money.divide(perfData.netProfit, 100)} EGP
- Profit Margin: ${perfData.profitMargin}%
- Transaction Count: ${perfData.transactionCount}
- Items Sold: ${perfData.itemsSold}
- Top Product: ${perfData.topProduct || 'N/A'}

Required: ONE evaluative sentence (15-25 words) focusing on the most critical KPI:
1. If profit margin < 15% → Focus on weak profitability
2. If avg basket (sales ÷ transactions) < 100 EGP → Focus on small basket size
3. If items per transaction < 3 → Focus on weak upselling
4. Otherwise → Evaluate overall performance

Format: Plain text, no emojis, no asterisks, professional direct language. Do not mention the employee name.`;
        } else {
          // DETAILED MODE - تحليل احترافي متعمق
          prompt = isArabic
            ? `أنت صيدلي إكلينيكي ومدير مالي بخبرة 20+ سنة. حلل الأداء التالي بعمق:

البيانات المالية الخام:
الموظف: ${perfData.employeeName}
الفترة: ${perfData.period}
إجمالي المبيعات: ${money.divide(perfData.totalSales, 100)} جنيه
صافي الربح: ${money.divide(perfData.netProfit, 100)} جنيه
هامش الربح الصافي: ${perfData.profitMargin}%
عدد الفواتير: ${perfData.transactionCount}
إجمالي القطع المباعة: ${perfData.itemsSold}
المنتج الأعلى مبيعاً: ${perfData.topProduct || 'غير محدد'}

مؤشرات الأداء المحسوبة (KPIs):
• متوسط قيمة الفاتورة (Avg Basket): ${money.divide(money.divide(perfData.totalSales, perfData.transactionCount), 100)} جنيه
• متوسط القطع لكل فاتورة (UPT): ${perfData.transactionCount > 0 ? (perfData.itemsSold / perfData.transactionCount).toFixed(2) : 0} قطعة
• متوسط سعر القطعة (ASP): ${money.divide(money.divide(perfData.totalSales, perfData.itemsSold), 100)} جنيه
• معدل الربح لكل فاتورة: ${money.divide(money.divide(perfData.netProfit, perfData.transactionCount), 100)} جنيه

التحليل المطلوب (بالترتيب):

**تقييم الربحية:**
حلل هامش الربح ${perfData.profitMargin}% مقارنة بالمعايير (ممتاز: 20%+، جيد: 15-20%، مقبول: 10-15%، ضعيف: أقل من 10%). اذكر السبب المحتمل.

**تقييم حجم السلة:**
حلل متوسط الفاتورة مقارنة بـ (ممتاز: 150+ جنيه، جيد: 100-150 جنيه، ضعيف: أقل من 100 جنيه).

**تقييم مهارات البيع الإضافي:**
حلل UPT (ممتاز: 4+ قطع، جيد: 3-4 قطع، ضعيف: أقل من 3 قطع).

**التوصية الاستراتيجية:**
بناءً على أضعف مؤشر، اقترح خطة عمل محددة وقابلة للتطبيق فوراً.

تحذيرات: لا تستخدم كلمات عامة بدون أرقام. اربط كل تقييم برقم محدد. لا رموز تعبيرية. استخدم ** للعناوين الأربعة فقط.`
            : `You are a clinical pharmacist and financial manager with 20+ years of experience. Provide deep analysis:

Raw Financial Data:
Employee: ${perfData.employeeName}
Period: ${perfData.period}
Total Sales: ${money.divide(perfData.totalSales, 100)} EGP
Net Profit: ${money.divide(perfData.netProfit, 100)} EGP
Net Profit Margin: ${perfData.profitMargin}%
Transaction Count: ${perfData.transactionCount}
Total Items Sold: ${perfData.itemsSold}
Top Selling Product: ${perfData.topProduct || 'N/A'}

Calculated KPIs:
• Average Basket Value: ${money.divide(money.divide(perfData.totalSales, perfData.transactionCount), 100)} EGP
• Units Per Transaction (UPT): ${perfData.transactionCount > 0 ? (perfData.itemsSold / perfData.transactionCount).toFixed(2) : 0} items
• Average Selling Price (ASP): ${money.divide(money.divide(perfData.totalSales, perfData.itemsSold), 100)} EGP
• Profit Per Transaction: ${money.divide(money.divide(perfData.netProfit, perfData.transactionCount), 100)} EGP

Required Analysis (In Order):

**Profitability Assessment:**
Analyze ${perfData.profitMargin}% margin against benchmarks (Excellent: 20%+, Good: 15-20%, Acceptable: 10-15%, Poor: <10%). State probable cause.

**Basket Size Evaluation:**
Analyze average transaction value vs (Excellent: 150+ EGP, Good: 100-150 EGP, Poor: <100 EGP).

**Upselling Skills Assessment:**
Analyze UPT (Excellent: 4+ items, Good: 3-4 items, Poor: <3 items).

**Strategic Recommendation:**
Based on weakest KPI, propose specific action plan that's immediately actionable.

Requirements: Never use generic terms without numbers. Link every evaluation to specific data points. No emojis. Use ** for four section headers only.`;
        }
      } else if (action === 'analyzeDrugInteraction') {
        const { drugName, context } = data;
        const isArabic = language === 'AR';

        prompt = isArabic
          ? `أنت صيدلي إكلينيكي استشاري. 

الدواء: "${drugName}"
السياق: "${context}"

المطلوب:
**التصنيف والآلية:** الفئة الدوائية وآلية العمل باختصار.
**التفاعلات الحرجة:** أهم التفاعلات الدوائية الخطيرة.
**الاعتبارات الإكلينيكية:** بناءً على السياق المذكور.
**التوصية النهائية:** هل الدواء مناسب؟ وما البديل إن لزم؟

التنسيق: استخدم ** للعناوين الأربعة فقط. بدون رموز تعبيرية.`
          : `You are a Board-Certified Clinical Pharmacy Specialist.

Drug: "${drugName}"
Context: "${context}"

Required:
**Classification & Mechanism:** Drug class and MOA briefly.
**Critical Interactions:** Most important major drug interactions.
**Clinical Considerations:** Based on stated context.
**Final Recommendation:** Is drug appropriate? Alternative if needed?

Format: Use ** for four section headers only. No emojis.`;
      } else if (action === 'generateHealthTip') {
        prompt = 'Write 1 short, catchy pharmacy health tip (max 15 words). No introspection.';
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
      });
      return response.text || 'No response';
    } catch (error: any) {
      console.error('Local AI Error:', error);

      // Detect specific error types
      const errorMessage = error?.message || error?.toString() || '';

      if (
        errorMessage.includes('429') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('quota')
      ) {
        throw new Error('QUOTA_EXCEEDED');
      } else if (
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('net::')
      ) {
        throw new Error('NETWORK_ERROR');
      } else if (errorMessage.includes('API_KEY') || errorMessage.includes('INVALID_ARGUMENT')) {
        throw new Error('API_KEY_INVALID');
      }

      throw error;
    }
  }

  // PRODUCTION MODE: Call Netlify Function Proxy
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data, language }),
    });

    if (!response.ok) {
      console.warn('AI Proxy Error Status:', response.status);
      throw new Error('AI service unreachable');
    }

    const result = await response.json();
    return result.result || 'No response';
  } catch (error) {
    console.error('AI Service Error:', error);
    throw error;
  }
};

export const analyzeDrugInteraction = async (
  drugName: string,
  context: string
): Promise<string> => {
  try {
    return await callAI('analyzeDrugInteraction', { drugName, context });
  } catch (error) {
    return "Sorry, I couldn't retrieve the drug information right now.";
  }
};

export const generateHealthTip = async (): Promise<string> => {
  try {
    return await callAI('generateHealthTip', {});
  } catch (e) {
    return 'Health is wealth.';
  }
};

export const analyzeEmployeePerformance = async (
  data: EmployeePerformanceData,
  language: 'AR' | 'EN' = 'EN',
  mode: 'short' | 'detailed' = 'detailed'
): Promise<string> => {
  try {
    return await callAI('analyzeEmployeePerformance', { ...data, mode }, language);
  } catch (error: any) {
    const errorType = error?.message || '';
    let friendlyMessage = '';

    if (errorType === 'QUOTA_EXCEEDED') {
      friendlyMessage =
        language === 'AR'
          ? '⚠️ تجاوزت الحد اليومي (Quota). يرجى المحاولة لاحقاً.'
          : '⚠️ Daily quota exceeded. Please try again later.';
    } else if (errorType === 'NETWORK_ERROR') {
      friendlyMessage =
        language === 'AR' ? '🌐 مشكلة في الاتصال بالشبكة.' : '🌐 Network connection error.';
    } else if (errorType === 'API_KEY_INVALID') {
      friendlyMessage = language === 'AR' ? '🔑 مفتاح API غير صالح.' : '🔑 Invalid API key.';
    } else {
      friendlyMessage =
        language === 'AR' ? '❌ خطأ غير متوقع في خدمة AI.' : '❌ Unexpected AI service error.';
    }

    throw new Error(friendlyMessage);
  }
};
