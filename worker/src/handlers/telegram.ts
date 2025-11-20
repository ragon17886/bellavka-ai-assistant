import { Env } from '../index';
import { D1Service } from '../db/D1Service';
import { TelegramUser } from '../db/types';
import { GeminiService } from '../assistants/GeminiService';

// Типы для Telegram
interface TelegramMessage {
    message_id: number;
    from: TelegramUser;
    chat: {
        id: number;
    };
    text?: string;
    photo?: Array<{
        file_id: string;
        file_size: number;
    }>;
}

/**
 * Отправка сообщения в Telegram
 */
async function sendMessage(chatId: number, text: string, env: Env): Promise<void> {
    try {
        const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
            }),
        });
        
        if (!response.ok) {
            console.error('Telegram API error:', await response.text());
        }
    } catch (error) {
        console.error('Error sending message to Telegram:', error);
    }
}

/**
 * Основной обработчик входящих сообщений Telegram.
 */
export async function handleMessage(message: TelegramMessage, env: Env, dbService: D1Service): Promise<void> {
    const chatId = message.chat.id;
    const tgUser: TelegramUser = message.from;
    const text = message.text;
    const isPhoto = message.photo && message.photo.length > 0;

    console.log(`Processing message from ${tgUser.first_name}: ${text}`);

    try {
        // 1. Получение или создание пользователя и логирование сообщения
        const user = await dbService.getOrCreateUser(tgUser);
        
        if (text) {
            await dbService.logDialog(user.tg_id, 'user', text);
        } else if (isPhoto && message.photo) {
            const largestPhoto = message.photo.reduce((prev, current) => 
                (prev.file_size > current.file_size) ? prev : current
            );
            await dbService.logDialog(user.tg_id, 'user', 'Photo received', JSON.stringify({ file_id: largestPhoto.file_id }));
        }

        // 2. Обработка команды /start
        if (text === '/start') {
            await sendMessage(chatId, `Добро пожаловать, ${user.full_name}! Я ваш AI-ассистент Bellavka. Задайте мне любой вопрос!`, env);
            return;
        }

        // 3. Обработка фото (временно отключено)
        if (isPhoto) {
            await sendMessage(chatId, 'Извините, обработка фото временно недоступна. Отправьте текстовое сообщение.', env);
            return;
        }

        // 4. Обработка текстового запроса с использованием Gemini
        if (text) {
            // Получаем историю диалогов для контекста
            const history = await dbService.getDialogHistory(user.tg_id, 6); // Последние 6 сообщений
            
            // Системный промпт для ассистента
            const systemInstruction = `Ты — AI-ассистент Bellavka. Твой стиль общения — вежливый, дружелюбный, но профессиональный.
Отвечай на вопросы о товарах и услугах Bellavka. Если не знаешь ответа, вежливо предложи уточнить вопрос или обратиться к менеджеру.
Будь кратким и полезным. Используй историю диалога для контекста.`;

            // Генерируем ответ с помощью Gemini
            const geminiService = new GeminiService(env);
            const responseText = await geminiService.generateTextResponse(systemInstruction, history);

            // Логируем ответ ассистента
            await dbService.logDialog(user.tg_id, 'assistant', responseText);

            // Отправляем ответ пользователю
            await sendMessage(chatId, responseText, env);
            return;
        }

        // 5. Обработка других типов сообщений
        await sendMessage(chatId, `${user.full_name}, я могу обрабатывать только текст и фото. Отправьте текстовое сообщение!`, env);

    } catch (error) {
        console.error('Error in handleMessage:', error);
        await sendMessage(chatId, 'Произошла ошибка при обработке вашего сообщения. Пожалуйста, попробуйте еще раз.', env);
    }
}