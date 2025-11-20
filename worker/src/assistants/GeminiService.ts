import { GoogleGenAI, Content, Part } from '@google/genai';
import { Env } from '../index';
import { Dialog } from '../db/types';

export class GeminiService {
    private ai: GoogleGenAI;
    private model: string = 'gemini-2.5-flash-lite';

    constructor(env: Env) {
        if (!env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set');
        }
        this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }

    /**
     * Преобразует историю диалогов из D1 в формат, понятный Gemini API.
     */
    private mapDialogsToContents(history: Dialog[]): Content[] {
        if (!history || history.length === 0) {
            return [];
        }
        
        return history
            .filter(dialog => dialog.role !== 'system')
            .map(dialog => {
                const role = dialog.role === 'assistant' ? 'model' : 'user';
                return {
                    role,
                    parts: [{ text: dialog.content }]
                };
            });
    }

    /**
     * Генерирует ответ на текстовый запрос.
     */
    async generateTextResponse(systemInstruction: string, history: Dialog[]): Promise<string> {
        try {
            console.log('Generating response with Gemini...');
            
            const contents = this.mapDialogsToContents(history);
            
            if (contents.length === 0) {
                return "Здравствуйте! Я ваш AI-ассистент Bellavka. Чем могу помочь?";
            }

            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: contents,
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                }
            });

            return response.text?.trim() || "Извините, не удалось сгенерировать ответ.";

        } catch (error: any) {
            console.error('Gemini API Error:', error);
            
            if (error.message?.includes('API key')) {
                return "Ошибка: Неверный API ключ Gemini.";
            } else if (error.message?.includes('quota')) {
                return "Превышена квота API. Попробуйте позже.";
            } else if (error.message?.includes('contents are required')) {
                return "Здравствуйте! Расскажите, чем могу помочь?";
            } else {
                return "Извините, произошла ошибка при обращении к AI-ассистенту. Попробуйте повторить запрос позже.";
            }
        }
    }

    /**
     * Упрощенная версия для быстрого ответа без истории
     */
    async generateQuickResponse(userMessage: string, systemInstruction: string): Promise<string> {
        try {
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: userMessage }]
                    }
                ],
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                }
            });

            return response.text?.trim() || "Не удалось сгенерировать ответ";

        } catch (error) {
            console.error('Gemini quick response error:', error);
            return "Привет! Я AI-ассистент Bellavka. Задайте ваш вопрос!";
        }
    }
}