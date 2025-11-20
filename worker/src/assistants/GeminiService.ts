import { GoogleGenAI, Content, Part } from '@google/genai';
import { Env } from '../index';
import { Dialog } from '../db/types';

export class GeminiService {
    private ai: GoogleGenAI;
    private model: string = 'gemini-2.5-flash'; // Оптимальная модель для чат-бота

    constructor(env: Env) {
        // Инициализация Gemini API с использованием ключа из окружения
        this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }

    /**
     * Преобразует историю диалогов из D1 в формат, понятный Gemini API.
     * @param history История диалогов из D1.
     * @returns Массив объектов Content для Gemini.
     */
    private mapDialogsToContents(history: Dialog[]): Content[] {
        return history.map(dialog => {
            // Роли в D1: 'user', 'assistant', 'system'
            // Роли в Gemini: 'user', 'model'
            const role = dialog.role === 'assistant' ? 'model' : 'user';
            
            // Если роль 'system', мы игнорируем ее для истории, но можем использовать для system_instruction
            if (dialog.role === 'system') {
                return null;
            }

            // Простая обработка текстового контента
            const parts: Part[] = [{ text: dialog.content }];

            return { role, parts };
        }).filter((content): content is Content => content !== null);
    }

    /**
     * Генерирует ответ на текстовый запрос, используя историю диалогов.
     * @param systemInstruction Системная инструкция (промпт ассистента).
     * @param history История диалогов из D1.
     * @returns Текстовый ответ от Gemini.
     */
    async generateTextResponse(systemInstruction: string, history: Dialog[]): Promise<string> {
        const contents = this.mapDialogsToContents(history);

        // Последнее сообщение в истории - это текущий запрос пользователя
        const lastUserMessage = contents.pop();

        if (!lastUserMessage) {
            return "Извините, я не получил Ваш запрос.";
        }

        try {
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: [...contents, lastUserMessage],
                config: {
                    systemInstruction: systemInstruction,
                    // Настройки для более "человечного" ответа
                    temperature: 0.7, 
                    maxOutputTokens: 2048,
                }
            });

            return response.text.trim();
        } catch (error) {
            console.error("Gemini API Error:", error);
            return "Извините, произошла ошибка при обращении к AI-ассистенту. Попробуйте повторить запрос позже.";
        }
    }

    /**
     * Генерирует ответ на запрос с изображением.
     * @param systemInstruction Системная инструкция (промпт ассистента).
     * @param imagePart Часть с изображением (base64).
     * @param textPrompt Текстовый запрос, сопровождающий изображение.
     * @returns Текстовый ответ от Gemini.
     */
    async generateVisionResponse(systemInstruction: string, imagePart: Part, textPrompt: string): Promise<string> {
        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash', // Используем ту же модель, она поддерживает Vision
                contents: [
                    { role: 'user', parts: [imagePart, { text: textPrompt }] }
                ],
                config: {
                    systemInstruction: systemInstruction,
                    temperature: 0.4, // Более низкая температура для точного анализа
                    maxOutputTokens: 2048,
                }
            });

            return response.text.trim();
        } catch (error) {
            console.error("Gemini Vision API Error:", error);
            return "Извините, произошла ошибка при анализе изображения. Попробуйте повторить запрос позже.";
        }
    }
}
