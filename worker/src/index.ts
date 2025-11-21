import { handleAdminRequest } from './api/admin';
import { handleTelegramWebhook } from './handlers/telegram';
import { D1Service } from './db/D1Service';

export interface Env {
  DB: D1Database;
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
    
    console.log('📨 Request:', url.pathname);

    // 🛠️ АДМИН API
    if (url.pathname.startsWith('/api/admin/')) {
      return handleAdminRequest(request, env, url.pathname);
    }

    // 🎯 ПРЯМОЙ ENDPOINT ДЛЯ /users (временно)
    if (url.pathname === '/api/admin/users') {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      if (request.method === 'GET') {
        try {
          const result = await env.DB.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 50').all();
          return new Response(JSON.stringify(result.results || []), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // 🤖 TELEGRAM WEBHOOK
    if (url.pathname === '/webhook' || url.pathname === '/') {
      const dbService = new D1Service(env);
      return handleTelegramWebhook(request, env, ctx, dbService);
    }

    return new Response('Bellavka AI Assistant Worker', { status: 200 });
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