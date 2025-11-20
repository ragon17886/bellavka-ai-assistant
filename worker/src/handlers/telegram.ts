import { Env } from '../index';
import { D1Service } from '../db/D1Service';
import { TelegramUser } from '../db/types';
import { GeminiService } from '../assistants/GeminiService'; // <-- НОВЫЙ ИМПОРТ

// Типы для Telegram (упрощенные)
interface TelegramMessage {
// ... (остальной код без изменений)

/**
 * Основной обработчик входящих сообщений Telegram.
 * @param message Объект сообщения Telegram
 * @param env Окружение Worker
 * @param dbService Сервис для работы с D1
 */
export async function handleMessage(message: TelegramMessage, env: Env, dbService: D1Service): Promise<void> {
    const chatId = message.chat.id;
    const tgUser: TelegramUser = message.from;
    const text = message.text;
    const isPhoto = message.photo && message.photo.length > 0;

    // 1. Получение или создание пользователя и логирование сообщения
    const user = await dbService.getOrCreateUser(tgUser);
    
    if (text) {
        await dbService.logDialog(user.tg_id, 'user', text);
    } else if (isPhoto) {
        // В MVP без R2 мы просто логируем file_id, но не сохраняем сам файл
        const largestPhoto = message.photo.reduce((prev, current) => (prev.file_size > current.file_size) ? prev : current);
        await dbService.logDialog(user.tg_id, 'user', 'Photo received', JSON.stringify({ file_id: largestPhoto.file_id }));
    }

    // 2. Обработка команды /start
    if (text === '/start') {
        // ... (код без изменений)
        return;
    }

    // 3. Обработка фото
    if (isPhoto) {
        // ... (код без изменений)
        return;
    }

    // 4. Обработка текстового запроса (ОСНОВНАЯ ЛОГИКА)
    if (text) {
        // 1. Получаем историю диалогов для контекста
        const history = await dbService.getDialogHistory(user.tg_id, 10); // Последние 10 сообщений

        // 2. Определяем системный промпт (пока используем заглушку)
        // В будущем здесь будет логика маршрутизации к Ассистенту-продавцу, Ассистенту-доставки и т.д.
        const systemInstruction = `Вы — AI-ассистент Bellavka. Ваш стиль общения — вежливый, официальный, обращение на Вы.
Ваша задача — отвечать на вопросы пользователя о товарах и услугах Bellavka.
Используйте историю диалога для поддержания контекста.
Если пользователь спрашивает о товаре, который Вы не можете найти, вежливо предложите поискать по фото или дать более точное описание.
Ваш ответ должен быть кратким и по существу.`;

        // 3. Генерируем ответ с помощью Gemini
        const geminiService = new GeminiService(env);
        const responseText = await geminiService.generateTextResponse(systemInstruction, history);

        // 4. Логируем ответ ассистента
        await dbService.logDialog(user.tg_id, 'assistant', responseText);

        // 5. Отправляем ответ пользователю
        await sendMessage(chatId, responseText, env);
        return;
    }

    // 5. Обработка других типов сообщений
    await sendMessage(chatId, `*${user.full_name}*, я могу обрабатывать только текст и фото.`, env);
}
