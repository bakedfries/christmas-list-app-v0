import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedGiftItem } from "../types";

export const parseWishlistFromImage = async (dataUrl: string): Promise<GeneratedGiftItem[]> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error("API Key is missing. Make sure API_KEY is in your environment variables.");
    throw new Error("Missing API Key. Check console for details.");
  }

  // 1. Extract Mime Type and Base64 Data from the Data URL
  // Format: "data:image/png;base64,iVBORw0KGgoAAA..."
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid image format. Please try another photo.");
  }
  const mimeType = matches[1]; // e.g., "image/png"
  const base64Data = matches[2];

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Analyze this image of a handwritten or digital gift list. Extract all gift items mentioned. If a price or store is mentioned, include it in the title. If there is a clear URL, put it in the link field. Return ONLY a raw JSON array. Do not include markdown formatting or explanations."
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              link: { type: Type.STRING, nullable: true }
            },
            required: ["title"]
          }
        }
      }
    });

    const text = response.text;
    console.log("Gemini Raw Response:", text); // For debugging

    if (!text) return [];
    
    // 2. Robust JSON Cleaning
    // Sometimes AI returns ```json [ ... ] ``` despite instructions.
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Ensure we only parse the array part if there's extra text
    const firstBracket = cleanText.indexOf('[');
    const lastBracket = cleanText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      cleanText = cleanText.substring(firstBracket, lastBracket + 1);
    }
    
    return JSON.parse(cleanText) as GeneratedGiftItem[];
  } catch (error) {
    console.error("Error parsing wishlist:", error);
    throw error;
  }
};