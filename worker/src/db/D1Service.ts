import { Env } from '../index';
import { User, Dialog, TelegramUser, Assistant } from './types';
import type { D1Database } from '@cloudflare/workers-types';

export class D1Service {
    private db: D1Database;
    private hasTables: boolean = false;

    constructor(env: Env) {
        this.db = env.DB;
        this.checkTables();
    }

    private async checkTables(): Promise<void> {
        try {
            // Проверяем существование таблицы users
            await this.db.prepare("SELECT 1 FROM users LIMIT 1").run();
            this.hasTables = true;
            console.log('D1 tables are available');
        } catch (error) {
            console.log('D1 tables not available, using fallback mode');
            this.hasTables = false;
        }
    }

    /**
     * Получает пользователя по Telegram ID или создает нового, если не найден.
     */
    async getOrCreateUser(tgUser: TelegramUser): Promise<User> {
        if (!this.hasTables) {
            // Fallback без БД
            return {
                tg_id: tgUser.id,
                full_name: tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : ''),
                fio: null,
                phone: null,
                city: null,
                adress: null,
                is_blocked: 0,
                last_activity: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
        }

        try {
            const { id: tg_id, first_name, last_name } = tgUser;
            const fullName = last_name ? `${first_name} ${last_name}` : first_name;

            const result = await this.db.prepare(
                'SELECT * FROM users WHERE tg_id = ?'
            ).bind(tg_id).first<User>();

            if (result) {
                await this.db.prepare(
                    'UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE tg_id = ?'
                ).bind(tg_id).run();
                return result;
            }

            await this.db.prepare(
                `INSERT INTO users (tg_id, full_name, last_activity, created_at) 
                 VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
            ).bind(tg_id, fullName).run();

            const newUser = await this.db.prepare(
                'SELECT * FROM users WHERE tg_id = ?'
            ).bind(tg_id).first<User>();

            if (!newUser) {
                throw new Error('Failed to retrieve newly created user.');
            }

            return newUser;

        } catch (error) {
            console.error('Error in getOrCreateUser:', error);
            // Fallback при ошибке
            return {
                tg_id: tgUser.id,
                full_name: tgUser.first_name + (tgUser.last_name ? ' ' + tgUser.last_name : ''),
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
        if (!this.hasTables) {
            console.log(`[LOG] Dialog - User: ${tg_id}, Role: ${role}, Content: ${content}`);
            return;
        }

        try {
            const session_id = `tg_${tg_id}_${Date.now()}`;
            await this.db.prepare(
                `INSERT INTO dialogs (session_id, tg_id, role, content, metadata, timestamp) 
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
            ).bind(session_id, tg_id, role, content, metadata).run();
        } catch (error) {
            console.error('Error in logDialog:', error);
        }
    }

    /**
     * Получает последние N сообщений для формирования контекста.
     */
    async getDialogHistory(tg_id: number, limit: number = 10): Promise<Dialog[]> {
        if (!this.hasTables) {
            return [];
        }

        try {
            const result = await this.db.prepare(
                `SELECT * FROM dialogs 
                 WHERE tg_id = ? 
                 ORDER BY id DESC 
                 LIMIT ?`
            ).bind(tg_id, limit).all<Dialog>();

            return result.results ? result.results.reverse() : [];
        } catch (error) {
            console.error('Error in getDialogHistory:', error);
            return [];
        }
    }

    // ==================== АДМИН МЕТОДЫ ====================

    /**
     * Получает всех ассистентов
     */
    async getAssistants(): Promise<Assistant[]> {
        if (!this.hasTables) {
            console.log('D1 tables not available for getAssistants');
            return [];
        }

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

    /**
     * Создает нового ассистента
     */
    async createAssistant(assistant: Omit<Assistant, 'id' | 'created_at' | 'updated_at'>): Promise<Assistant> {
        if (!this.hasTables) {
            console.log('D1 tables not available for createAssistant');
            throw new Error('Database tables not available');
        }

        const id = `assistant_${Date.now()}`;
        
        try {
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

        } catch (error) {
            console.error('Error creating assistant:', error);
            throw error;
        }
    }

    /**
     * Получает диалоги с информацией о пользователях (для админки)
     */
    async getDialogsWithUsers(page: number = 1, limit: number = 50): Promise<any[]> {
        if (!this.hasTables) {
            console.log('D1 tables not available for getDialogsWithUsers');
            return [];
        }

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

    /**
     * Получает все диалоги конкретного пользователя
     */
    async getUserDialogs(tgId: number): Promise<any[]> {
        if (!this.hasTables) {
            console.log('D1 tables not available for getUserDialogs');
            return [];
        }

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

    /**
     * Получает список уникальных пользователей с последней активностью
     */
    async getUsersWithLastActivity(): Promise<any[]> {
        if (!this.hasTables) {
            console.log('D1 tables not available for getUsersWithLastActivity');
            return [];
        }

        try {
            const result = await this.db.prepare(`
                SELECT 
                    u.tg_id,
                    u.full_name,
                    u.created_at,
                    MAX(d.timestamp) as last_activity,
                    COUNT(d.id) as message_count
                FROM users u
                LEFT JOIN dialogs d ON u.tg_id = d.tg_id
                GROUP BY u.tg_id, u.full_name, u.created_at
                ORDER BY last_activity DESC
            `).all();
            
            return result.results || [];
        } catch (error) {
            console.error('Error getting users with last activity:', error);
            return [];
        }
    }

    /**
     * Получает статистику по диалогам
     */
    async getDialogStats(): Promise<any> {
        if (!this.hasTables) {
            console.log('D1 tables not available for getDialogStats');
            return { totalDialogs: 0, totalUsers: 0, recentActivity: 0 };
        }

        try {
            const totalDialogs = await this.db.prepare(
                'SELECT COUNT(*) as count FROM dialogs'
            ).first<{ count: number }>();

            const totalUsers = await this.db.prepare(
                'SELECT COUNT(*) as count FROM users'
            ).first<{ count: number }>();

            const recentActivity = await this.db.prepare(
                'SELECT COUNT(*) as count FROM dialogs WHERE timestamp > datetime("now", "-1 day")'
            ).first<{ count: number }>();

            return {
                totalDialogs: totalDialogs?.count || 0,
                totalUsers: totalUsers?.count || 0,
                recentActivity: recentActivity?.count || 0
            };
        } catch (error) {
            console.error('Error getting dialog stats:', error);
            return { totalDialogs: 0, totalUsers: 0, recentActivity: 0 };
        }
    }

    /**
     * Обновляет ассистента
     */
    async updateAssistant(id: string, updates: Partial<Assistant>): Promise<Assistant> {
        if (!this.hasTables) {
            console.log('D1 tables not available for updateAssistant');
            throw new Error('Database tables not available');
        }

        try {
            const setClauses: string[] = [];
            const values: any[] = [];

            if (updates.name !== undefined) {
                setClauses.push('name = ?');
                values.push(updates.name);
            }
            if (updates.type !== undefined) {
                setClauses.push('type = ?');
                values.push(updates.type);
            }
            if (updates.system_prompt !== undefined) {
                setClauses.push('system_prompt = ?');
                values.push(updates.system_prompt);
            }
            if (updates.tov_snippet !== undefined) {
                setClauses.push('tov_snippet = ?');
                values.push(updates.tov_snippet);
            }
            if (updates.handoff_rules !== undefined) {
                setClauses.push('handoff_rules = ?');
                values.push(updates.handoff_rules);
            }
            if (updates.is_active !== undefined) {
                setClauses.push('is_active = ?');
                values.push(updates.is_active ? 1 : 0);
            }

            setClauses.push('updated_at = CURRENT_TIMESTAMP');
            values.push(id);

            await this.db.prepare(
                `UPDATE assistants SET ${setClauses.join(', ')} WHERE id = ?`
            ).bind(...values).run();

            const updatedAssistant = await this.db.prepare(
                'SELECT * FROM assistants WHERE id = ?'
            ).bind(id).first<Assistant>();

            if (!updatedAssistant) {
                throw new Error('Assistant not found');
            }

            return updatedAssistant;

        } catch (error) {
            console.error('Error updating assistant:', error);
            throw error;
        }
    }

    /**
     * Удаляет ассистента
     */
    async deleteAssistant(id: string): Promise<boolean> {
        if (!this.hasTables) {
            console.log('D1 tables not available for deleteAssistant');
            throw new Error('Database tables not available');
        }

        try {
            const result = await this.db.prepare(
                'DELETE FROM assistants WHERE id = ?'
            ).bind(id).run();

            return result.success;
        } catch (error) {
            console.error('Error deleting assistant:', error);
            throw error;
        }
    }

// Упрощенный метод для получения статистики
async getSimpleStats(): Promise<any> {
  if (!this.hasTables) {
    return { users: 0, dialogs: 0, assistants: 0 };
  }

  try {
    const usersResult = await this.db.prepare(
      'SELECT COUNT(*) as count FROM users'
    ).first<{ count: number }>();

    const dialogsResult = await this.db.prepare(
      'SELECT COUNT(*) as count FROM dialogs'
    ).first<{ count: number }>();

    const assistantsResult = await this.db.prepare(
      'SELECT COUNT(*) as count FROM assistants'
    ).first<{ count: number }>();

    return {
      users: usersResult?.count || 0,
      dialogs: dialogsResult?.count || 0,
      assistants: assistantsResult?.count || 0
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { users: 0, dialogs: 0, assistants: 0 };
  }
}

}