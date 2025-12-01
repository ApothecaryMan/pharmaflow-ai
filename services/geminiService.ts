import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDrugInteraction = async (drugName: string, context: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `You are a helpful pharmaceutical assistant. 
    The user is asking about the drug: "${drugName}".
    Context or specific question: "${context}".
    
    Please provide a concise, safety-focused summary. Include common side effects, interactions, and key usage warnings. 
    Keep it under 150 words. Format with bullet points for readability.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "No information available at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I couldn't retrieve the drug information right now. Please check your API key.";
  }
};

export const generateHealthTip = async (): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Give me one short, random, interesting health fact or tip for a pharmacy display screen. Max 20 words.",
        });
        return response.text || "Stay hydrated!";
    } catch (e) {
        return "Health is wealth.";
    }
}
