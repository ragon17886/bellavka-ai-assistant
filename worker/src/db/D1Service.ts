import { Env } from '../index';
import { User, Dialog, TelegramUser } from './types';

export class D1Service {
private db: D1Database;

constructor(env: Env) {
this.db = env.DB;
}

async getOrCreateUser(tgUser: TelegramUser): Promise<User> {
try {
const { id: tg_id, first_name, last_name } = tgUser;
const fullName = last_name ? ${first_name} ${last_name} : first_name;
  // Поиск пользователя
  const existingUser = await this.db.prepare(
    'SELECT * FROM users WHERE tg_id = ?'
  ).bind(tg_id).first() as User | null;

  if (existingUser) {
    // Обновление активности
    await this.db.prepare(
      'UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE tg_id = ?'
    ).bind(tg_id).run();
    return existingUser;
  }

  // Создание нового пользователя
  await this.db.prepare(
    `INSERT INTO users (tg_id, full_name, last_activity, created_at) 
     VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(tg_id, fullName).run();

  const newUser = await this.db.prepare(
    'SELECT * FROM users WHERE tg_id = ?'
  ).bind(tg_id).first() as User;

  return newUser;

} catch (error) {
  console.error('Error in getOrCreateUser:', error);
  // Fallback
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
async logDialog(tg_id: number, role: 'user' | 'assistant' | 'system', content: string, metadata: string | null = null): Promise<void> {
try {
const session_id = tg_${tg_id}_${Date.now()};
await this.db.prepare(
INSERT INTO dialogs (session_id, tg_id, role, content, metadata, timestamp) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
).bind(session_id, tg_id, role, content, metadata).run();
} catch (error) {
console.error('Error in logDialog:', error);
}
}

async getDialogHistory(tg_id: number, limit: number = 10): Promise<Dialog[]> {
try {
const result = await this.db.prepare(
SELECT * FROM dialogs WHERE tg_id = ? ORDER BY id DESC LIMIT ?
).bind(tg_id, limit).all();
  // Исправление типизации
  return (result.results as unknown as Dialog[])?.reverse() || [];
} catch (error) {
  console.error('Error in getDialogHistory:', error);
  return [];
}
}
}