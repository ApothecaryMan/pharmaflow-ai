import { GoogleGenAI } from "@google/genai";

interface EmployeePerformanceData {
    employeeName: string;
    period: string;
    totalSales: number;
    netProfit: number;
    profitMargin: number;
    itemsSold: number;
    transactionCount: number;
    topProduct?: string;
    salesTrend?: number;
}

export default async (request: Request) => {
    // Only allow POST
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const { action, data, language = 'EN' } = body;

        // Initialize Gemini with server-side env variable
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

        let prompt = '';
        
        if (action === 'analyzeEmployeePerformance') {
            const perfData = data as EmployeePerformanceData;
            const isArabic = language === 'AR';
            
            const dataContext = isArabic
                ? `الموظف: ${perfData.employeeName} | الفترة: ${perfData.period} | المبيعات: ${perfData.totalSales} | الربح: ${perfData.netProfit} (${perfData.profitMargin}%) | الفواتير: ${perfData.transactionCount} | القطع: ${perfData.itemsSold} | الأعلى مبيعاً: ${perfData.topProduct || 'N/A'}`
                : `Employee: ${perfData.employeeName} | Period: ${perfData.period} | Sales: ${perfData.totalSales} | Profit: ${perfData.netProfit} (${perfData.profitMargin}%) | Tx: ${perfData.transactionCount} | Items: ${perfData.itemsSold} | Top Item: ${perfData.topProduct || 'N/A'}`;

            prompt = isArabic 
            ? `بصفتك مدير صيدلية خبير، حلل البيانات المالية التالية للموظف.
               البيانات: [${dataContext}]
               
               المطلوب: تقرير أداء فوري ومباشر في 3 نقاط فقط:
               1. **نقطة قوة بارزة** (مدعومة بالأرقام).
               2. **فرصة للتحسين** (استنتجها من الهامش أو متوسط الفاتورة).
               3. **توصية عملية** لزيادة المبيعات في الفترة القادمة.
               
               تحذير: لا تستخدم أي رموز تعبيرية (emojis). استخدم **للعناوين العريضة**. ادخل في صلب الموضوع فوراً.`
            : `Act as an Expert Pharmacy Manager. Analyze the following staff performance data.
               Data: [${dataContext}]
               
               Output: Strictly 3 concise bullet points:
               1. **Key Strength** (cite specific metric).
               2. **Improvement Area** (derive from margin/basket size).
               3. **Actionable Tactic** to boost revenue next period.
               
               IMPORTANT: No emojis. Use **bold** for headings. Direct analysis only.`;

        } else if (action === 'analyzeDrugInteraction') {
            const { drugName, context } = data;
            prompt = `Role: Senior Clinical Pharmacist.
            Task: Safety check for "${drugName}". Context: "${context}".
            Output: Concise list of critical points (Interaction, Contraindication, or Key Counseling).
            Style: Telegraphic, urgent, safety-first. Max 3 bullet points. No standard disclaimers.`;
        } else if (action === 'generateHealthTip') {
            prompt = "Write 1 short, catchy pharmacy health tip (max 15 words). No introspection.";
        } else {
            return new Response(JSON.stringify({ error: "Unknown action" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return new Response(JSON.stringify({ result: response.text }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error("Gemini API Error:", error);
        return new Response(JSON.stringify({ error: "AI service unavailable" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

export const config = {
    path: "/api/ai"
};
