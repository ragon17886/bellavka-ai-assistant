/**
 * Cloudflare Worker for Bellavka AI Telegram Assistant
 */

import { handleMessage } from './handlers/telegram';
import { D1Service } from './db/D1Service';

export interface Env {
  // D1 Database Binding
  DB: D1Database;
  // Environment Variables
  TELEGRAM_BOT_TOKEN: string;
  GEMINI_API_KEY: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/webhook') {
      const dbService = new D1Service(env);
      return handleTelegramWebhook(request, env, ctx, dbService);
    }

    return new Response('Bellavka AI Assistant Worker is running.', { status: 200 });
  },
};

async function handleTelegramWebhook(request: Request, env: Env, ctx: ExecutionContext, dbService: D1Service): Promise<Response> {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const update: any = await request.json(); // Добавьте тип any
        
        // Проверка на наличие сообщения
        if (update.message) {
            ctx.waitUntil(handleMessage(update.message, env, dbService));
        }
        
        // Всегда возвращаем 200 OK, чтобы Telegram не переотправлял запрос
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Error processing webhook:', error);
        // В случае ошибки возвращаем 200, чтобы не блокировать Telegram
        return new Response('OK (Error handled)', { status: 200 });
    }
}