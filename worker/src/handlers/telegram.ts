import { Env } from '../index';
import { D1Service } from '../db/D1Service';
import { TelegramUser } from '../db/types';
// import { GeminiService } from '../assistants/GeminiService';

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
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
            }),
        });
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

    // 1. Получение или создание пользователя и логирование сообщения
/*    const user = await dbService.getOrCreateUser(tgUser);
    
    if (text) {
        await dbService.logDialog(user.tg_id, 'user', text);
    } else if (isPhoto && message.photo) {
        // В MVP без R2 мы просто логируем file_id, но не сохраняем сам файл
        const largestPhoto = message.photo.reduce((prev, current) => 
            (prev.file_size > current.file_size) ? prev : current
        );
        await dbService.logDialog(user.tg_id, 'user', 'Photo received', JSON.stringify({ file_id: largestPhoto.file_id }));
    }
*/

    console.log(`Message from ${tgUser.first_name} (${chatId}): ${text}`);

    // Простой echo-бот
    if (text) {
        const echoText = `Эхо: ${text}`;
        console.log('Sending echo:', echoText);
        await sendMessage(chatId, echoText, env);
    } else {
        console.log('No text in message');
        await sendMessage(chatId, 'Я понимаю только текстовые сообщения', env);
    }

    // 2. Обработка команды /start
    if (text === '/start') {
        await sendMessage(chatId, `Добро пожаловать, ${user.full_name}! Я ваш AI-ассистент Bellavka.`, env);
        return;
    }

    // 3. Обработка фото
    if (isPhoto) {
        await sendMessage(chatId, 'Извините, обработка фото временно недоступна.', env);
        return;
    }

// 4. Обработка текстового запроса
if (text) {
    // Временный простой ответ
    const responseText = `Вы сказали: "${text}". В будущем здесь будет AI-ответ от Gemini.`;
    await dbService.logDialog(user.tg_id, 'assistant', responseText);
    await sendMessage(chatId, responseText, env);
    return;
}

    // 5. Обработка других типов сообщений
    await sendMessage(chatId, `*${user.full_name}*, я могу обрабатывать только текст и фото.`, env);
}