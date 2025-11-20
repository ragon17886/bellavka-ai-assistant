// Тип для таблицы users
export interface User {
    tg_id: number;
    full_name: string | null;
    fio: string | null;
    phone: string | null;
    city: string | null;
    adress: string | null;
    is_blocked: 0 | 1;
    last_activity: string;
    created_at: string;
}

// Тип для таблицы dialogs
export interface Dialog {
    id: number;
    session_id: string;
    tg_id: number;
    timestamp: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata: string | null; // JSON в виде строки
}

// Тип для Telegram User (упрощенный)
export interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
}
