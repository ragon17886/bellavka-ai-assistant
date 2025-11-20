import { Env } from '../index';
import { User, Dialog, TelegramUser } from './types';

export class D1Service {
    private db: D1Database;

    constructor(env: Env) {
        this.db = env.DB;
    }

    /**
     * Получает пользователя по Telegram ID или создает нового, если не найден.
     * @param tgUser Объект пользователя Telegram.
     * @returns Объект пользователя из D1.
     */
    async getOrCreateUser(tgUser: TelegramUser): Promise<User> {
        const { id: tg_id, first_name, last_name } = tgUser;
        const fullName = last_name ? `${first_name} ${last_name}` : first_name;

        // 1. Поиск пользователя
        const { results } = await this.db.prepare(
            'SELECT * FROM users WHERE tg_id = ?'
        ).bind(tg_id).all<User>();

        if (results && results.length > 0) {
            // 2. Пользователь найден, обновляем last_activity
            await this.db.prepare(
                'UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE tg_id = ?'
            ).bind(tg_id).run();
            return results[0];
        }

        // 3. Пользователь не найден, создаем нового
        const { success } = await this.db.prepare(
            `INSERT INTO users (tg_id, full_name, last_activity, created_at) 
             VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ).bind(tg_id, fullName).run();

        if (!success) {
            throw new Error('Failed to create new user in D1.');
        }

        // 4. Возвращаем созданного пользователя
        const { results: newResults } = await this.db.prepare(
            'SELECT * FROM users WHERE tg_id = ?'
        ).bind(tg_id).all<User>();

        if (!newResults || newResults.length === 0) {
            throw new Error('Failed to retrieve newly created user.');
        }

        return newResults[0];
    }

    /**
     * Записывает сообщение в историю диалогов.
     * @param tg_id Telegram ID пользователя.
     * @param role Роль сообщения ('user', 'assistant', 'system').
     * @param content Текст сообщения.
     * @param metadata Дополнительные данные (JSON-строка).
     */
    async logDialog(tg_id: number, role: Dialog['role'], content: string, metadata: string | null = null): Promise<void> {
        const session_id = `tg_${tg_id}_${Date.now()}`; // Простая генерация session_id
        
        await this.db.prepare(
            `INSERT INTO dialogs (session_id, tg_id, role, content, metadata, timestamp) 
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        ).bind(session_id, tg_id, role, content, metadata).run();
    }

    /**
     * Получает последние N сообщений для формирования контекста.
     * @param tg_id Telegram ID пользователя.
     * @param limit Максимальное количество сообщений.
     * @returns Массив объектов диалогов.
     */
    async getDialogHistory(tg_id: number, limit: number = 10): Promise<Dialog[]> {
        const { results } = await this.db.prepare(
            `SELECT * FROM dialogs 
             WHERE tg_id = ? 
             ORDER BY id DESC 
             LIMIT ?`
        ).bind(tg_id, limit).all<Dialog>();

        // Возвращаем в хронологическом порядке
        return results ? results.reverse() : [];
    }
}
