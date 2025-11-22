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
    
    console.log('📍 Incoming request:', url.pathname, request.method);

    // 🛠️ ADMIN API
    if (url.pathname.startsWith('/api/admin/')) {
      return handleAdminRequest(request, env, url.pathname);
    }

    // 🤖 TELEGRAM WEBHOOK
    if (url.pathname === '/webhook' || url.pathname === '/') {
      const dbService = new D1Service(env);
      return handleTelegramWebhook(request, env, ctx, dbService);
    }

    // ℹ️ DEFAULT RESPONSE
    return new Response('🚀 Bellavka AI Assistant Worker\n\nAvailable endpoints:\n- GET /api/admin/stats\n- GET /api/admin/users\n- GET /api/admin/dialogs\n- GET/POST /api/admin/assistants\n- POST /api/admin/query', { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  },
};

async function handleTelegramWebhook(
  request: Request, 
  env: Env, 
  ctx: ExecutionContext, 
  dbService: D1Service
): Promise<Response> {
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