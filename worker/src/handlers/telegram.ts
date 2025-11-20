import { Env } from '../index';
import { D1Service } from '../db/D1Service';
import { TelegramUser } from '../db/types';

// Типы для Telegram (упрощенные)
interface TelegramMessage {
    message_id: number;
    from: TelegramUser;
    chat: {
        id: number;
        type: string;
    };
    date: number;
    text?: string;
    photo?: any[]; // Упрощенный тип для фото
}

/**
 * Отправляет сообщение обратно в Telegram.
 * @param chatId ID чата
 * @param text Текст сообщения
 * @param env Окружение Worker
 */
async function sendMessage(chatId: number, text: string, env: Env): Promise<void> {
    const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
        } ),
    });
}

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
        const welcomeMessage = `Здравствуйте, *${user.full_name}*! 👋
Я — AI-ассистент Bellavka. Я могу помочь Вам:
1. Найти товар по фото.
2. Ответить на вопросы о товарах.
3. Рассчитать стоимость доставки.
4. Оформить заказ.

Обращайтесь ко мне на **Вы**. Какой у Вас вопрос?`;
        await sendMessage(chatId, welcomeMessage, env);
        return;
    }

    // 3. Обработка фото
    if (isPhoto) {
        await sendMessage(chatId, `*${user.full_name}*, спасибо за фото! Сейчас я проанализирую его с помощью Gemini Vision и найду похожие модели. Это займет несколько секунд.`, env);
        // Здесь будет вызов функции поиска по фото
        return;
    }

    // 4. Обработка текстового запроса
    if (text) {
        // Здесь будет логика маршрутизации и вызова ассистентов
        await sendMessage(chatId, `*${user.full_name}*, Вы написали: "${text}".
Я пока только учусь, но скоро смогу ответить на Ваш вопрос!
Сейчас я бы передал Ваш запрос Ассистенту-продавцу.`, env);
        return;
    }

    // 5. Обработка других типов сообщений
    await sendMessage(chatId, `*${user.full_name}*, я могу обрабатывать только текст и фото.`, env);
}
