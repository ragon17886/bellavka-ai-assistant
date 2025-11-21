import { handleAdminRequest } from './api/admin';
import { handleMessage } from './handlers/telegram';
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
    
    console.log('📍 Request to:', url.pathname, request.method);

    // 🛠️ ADMIN API - все пути
    if (url.pathname.startsWith('/api/admin/')) {
      console.log('🔧 Routing to admin API');
      return handleAdminRequest(request, env, url.pathname);
    }

    // 🎯 ПРЯМЫЕ ENDPOINTS ДЛЯ ДЕБАГА (временно)
    if (url.pathname === '/api/admin/users' && request.method === 'GET') {
      console.log('👥 Direct users endpoint');
      try {
        const result = await env.DB.prepare('SELECT * FROM users LIMIT 10').all();
        return new Response(JSON.stringify({ 
          success: true, 
          data: result.results || [],
          source: 'direct'
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ 
          error: error.message,
          source: 'direct'
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    if (url.pathname === '/api/admin/query' && request.method === 'POST') {
      console.log('🔧 Direct query endpoint');
      try {
        const { query } = await request.json();
        const result = await env.DB.prepare(query).all();
        return new Response(JSON.stringify({ 
          success: true, 
          data: result.results || [],
          source: 'direct'
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ 
          error: error.message,
          source: 'direct'
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // 🤖 TELEGRAM WEBHOOK
    if (url.pathname === '/webhook' || url.pathname === '/') {
      console.log('🤖 Routing to Telegram webhook');
      const dbService = new D1Service(env);
      return handleTelegramWebhook(request, env, ctx, dbService);
    }

    // ℹ️ DEFAULT
    return new Response('🚀 Bellavka AI Assistant Worker\n\nEndpoints:\n- GET /api/admin/stats\n- GET /api/admin/users\n- GET /api/admin/dialogs\n- GET/POST /api/admin/assistants\n- POST /api/admin/query', { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  },
};

async function handleTelegramWebhook(request: Request, env: Env, ctx: ExecutionContext, dbService: D1Service): Promise<Response> {
    console.log('Webhook called - Method:', request.method);
    
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const update: any = await request.json();
        
        if (update.message) {
            ctx.waitUntil(handleMessage(update.message, env, dbService));
        }
        
        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error('Error processing webhook:', error);
        return new Response('OK (Error handled)', { status: 200 });
    }
}