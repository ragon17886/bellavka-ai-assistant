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

		// Обрабатываем вебхук как на корневом пути, так и на /webhook
		if (url.pathname === '/webhook' || url.pathname === '/') {
			const dbService = new D1Service(env);
			return handleTelegramWebhook(request, env, ctx, dbService);
		}

		return new Response('Bellavka AI Assistant Worker is running.', { status: 200 });
	},
};

async function handleTelegramWebhook(request: Request, env: Env, ctx: ExecutionContext, dbService: D1Service): Promise<Response> {
    console.log('Webhook called - Method:', request.method);
    
    if (request.method !== 'POST') {
        console.log('Wrong method - returning 405');
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const update: any = await request.json();
        console.log('Received update:', JSON.stringify(update));
        
        // Проверка на наличие сообщения
        if (update.message) {
            console.log('Processing message from user:', update.message.from.id);
            ctx.waitUntil(handleMessage(update.message, env, dbService));
        } else {
            console.log('No message in update');
        }
        
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Error processing webhook:', error);
        return new Response('OK (Error handled)', { status: 200 });
    }
}