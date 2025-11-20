import { Env } from '../index';
import { User, Dialog, TelegramUser } from './types';
import type { D1Database } from '@cloudflare/workers-types';

export class D1Service {
    private db: D1Database;

    constructor(env: Env) {
        this.db = env.DB;
    }


    async getOrCreateUser(tgUser: TelegramUser): Promise<User> {
        const { id: tg_id, first_name, last_name } = tgUser;
        const fullName = last_name ? `${first_name} ${last_name}` : first_name;

        try {
            // 1. Поиск пользователя
            const result = await this.db.prepare(
                'SELECT * FROM users WHERE tg_id = ?'
            ).bind(tg_id).first<User>();

            if (result) {
                // 2. Пользователь найден, обновляем last_activity
                await this.db.prepare(
                    'UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE tg_id = ?'
                ).bind(tg_id).run();
                return result;
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
            const newUser = await this.db.prepare(
                'SELECT * FROM users WHERE tg_id = ?'
            ).bind(tg_id).first<User>();

            if (!newUser) {
                throw new Error('Failed to retrieve newly created user.');
            }

            return newUser;

        } catch (error) {
            console.error('Error in getOrCreateUser:', error);
            // Возвращаем заглушку в случае ошибки
            return {
                tg_id: tg_id,
                full_name: fullName,
                fio: null,
                phone: null,
                city: null,
                adress: null,
                is_blocked: 0,
                last_activity: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
        }
    }

    /**
     * Записывает сообщение в историю диалогов.
     */
    async logDialog(tg_id: number, role: Dialog['role'], content: string, metadata: string | null = null): Promise<void> {
        try {
            const session_id = `tg_${tg_id}_${Date.now()}`;
            
            await this.db.prepare(
                `INSERT INTO dialogs (session_id, tg_id, role, content, metadata, timestamp) 
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
            ).bind(session_id, tg_id, role, content, metadata).run();
        } catch (error) {
            console.error('Error in logDialog:', error);
            // Игнорируем ошибки логирования, чтобы не ломать основной функционал
        }
    }

    /**
     * Получает последние N сообщений для формирования контекста.
     */
    async getDialogHistory(tg_id: number, limit: number = 10): Promise<Dialog[]> {
        try {
            const result = await this.db.prepare(
                `SELECT * FROM dialogs 
                 WHERE tg_id = ? 
                 ORDER BY id DESC 
                 LIMIT ?`
            ).bind(tg_id, limit).all<Dialog>();

            // Возвращаем в хронологическом порядке
            return result.results ? result.results.reverse() : [];
        } catch (error) {
            console.error('Error in getDialogHistory:', error);
            return [];
        }
    }

// Ассистенты
    // Ассистенты
    async getAssistants(): Promise<Assistant[]> {
        try {
            const result = await this.db.prepare(
                'SELECT * FROM assistants ORDER BY created_at DESC'
            ).all<Assistant>();
            return result.results || [];
        } catch (error) {
            console.error('Error getting assistants:', error);
            return [];
        }
    }

    async createAssistant(assistant: Omit<Assistant, 'id' | 'created_at' | 'updated_at'>): Promise<Assistant> {
        const id = `assistant_${Date.now()}`;
        await this.db.prepare(
            `INSERT INTO assistants (id, name, type, system_prompt, tov_snippet, handoff_rules, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            id,
            assistant.name,
            assistant.type,
            assistant.system_prompt,
            assistant.tov_snippet || null,
            assistant.handoff_rules || null,
            assistant.is_active ? 1 : 0
        ).run();

        const newAssistant = await this.db.prepare(
            'SELECT * FROM assistants WHERE id = ?'
        ).bind(id).first<Assistant>();

        if (!newAssistant) {
            throw new Error('Failed to create assistant');
        }

        return newAssistant;
    }

  // Диалоги
  async getDialogsWithUsers(page: number = 1, limit: number = 50): Promise<any[]> {
    try {
      const offset = (page - 1) * limit;
      const result = await this.db.prepare(`
        SELECT d.*, u.full_name, u.tg_id 
        FROM dialogs d 
        LEFT JOIN users u ON d.tg_id = u.tg_id 
        ORDER BY d.timestamp DESC 
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all();
      
      return result.results || [];
    } catch (error) {
      console.error('Error getting dialogs with users:', error);
      return [];
    }
  }

  async getUserDialogs(tgId: number): Promise<any[]> {
    try {
      const result = await this.db.prepare(`
        SELECT d.*, u.full_name 
        FROM dialogs d 
        LEFT JOIN users u ON d.tg_id = u.tg_id 
        WHERE d.tg_id = ? 
        ORDER BY d.timestamp ASC
      `).bind(tgId).all();
      
      return result.results || [];
    } catch (error) {
      console.error('Error getting user dialogs:', error);
      return [];
    }
  }

}