import { GoogleGenAI } from "@google/genai";
import { AQIData, WeatherData, Language } from "../types";

// Simple cache for AI responses
const analysisCache = new Map<string, string>();

const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY is missing. Gemini features will not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeAirQuality = async (aqiData: AQIData, weatherData: WeatherData, lang: Language): Promise<string> => {
  // Create a cache key based on main data points
  const cacheKey = `${aqiData.location}-${aqiData.aqi}-${weatherData.condition}-${lang}`;
  
  if (analysisCache.has(cacheKey)) {
      return analysisCache.get(cacheKey)!;
  }

  const ai = getAIClient();
  if (!ai) return lang === 'ru' ? "AI недоступен (нет API ключа)." : "AI services are currently unavailable (Missing API Key).";

  const prompt = `
    Analyze the following air quality and weather data for ${aqiData.location}.
    Current AQI: ${aqiData.aqi} (${aqiData.level}).
    Pollutants: PM2.5: ${aqiData.pollutants.pm25.value}, PM10: ${aqiData.pollutants.pm10.value}, NO2: ${aqiData.pollutants.no2.value}.
    Weather: ${weatherData.temp}°C, ${weatherData.condition}, Humidity: ${weatherData.humidity}%.
    
    Provide a concise, 3-sentence health recommendation for the general public. 
    Focus on whether it is safe to exercise outdoors and if masks are needed.
    
    IMPORTANT: The response MUST be in ${lang === 'ru' ? 'Russian' : 'English'} language.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = response.text || (lang === 'ru' ? "Не удалось сгенерировать анализ." : "Unable to generate analysis.");
    analysisCache.set(cacheKey, text);
    return text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return lang === 'ru' ? "Ошибка соединения с AI." : "Error connecting to AI analysis service.";
  }
};

export const processCrowdsourceReport = async (report: string, location: string, lang: Language): Promise<string> => {
   const ai = getAIClient();
   if (!ai) return lang === 'ru' ? "AI недоступен." : "AI unavailable.";

   const prompt = `
     A user in ${location} reported: "${report}".
     Based on this qualitative report, what is the likely source of pollution? 
     (e.g., traffic, industrial, wildfire, dust storm). 
     Keep the answer very short (under 20 words).
     Response language: ${lang === 'ru' ? 'Russian' : 'English'}.
   `;

   try {
     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
     });
     return response.text || (lang === 'ru' ? "Отчет принят." : "Report logged.");
   } catch (e) {
     return lang === 'ru' ? "Отчет сохранен локально." : "Report logged locally.";
   }
}

export const chatWithAssistant = async (message: string, context: string, lang: Language): Promise<string> => {
    const ai = getAIClient();
    if (!ai) return lang === 'ru' ? "Я сейчас офлайн." : "I'm offline right now.";

    const systemPrompt = `You are CleanSky Bot, a helpful air quality assistant. 
    Use the following context to answer the user's question if relevant: ${context}.
    Keep answers short, friendly, and helpful for mobile users.
    ALWAYS answer in ${lang === 'ru' ? 'Russian' : 'English'} language.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: message,
            config: {
                systemInstruction: systemPrompt
            }
        });
        return response.text || (lang === 'ru' ? "Я не расслышал, повторите?" : "I didn't quite catch that.");
    } catch (error) {
        return lang === 'ru' ? "Проблемы с соединением." : "Sorry, I'm having trouble connecting to the server.";
    }
}