import { D1Service } from '../db/D1Service';
import { Env } from '../index';
import { Assistant } from '../db/types';

// Удалите дублирующее определение Assistant - используем импорт

export async function handleAdminRequest(request: Request, env: Env, pathname: string): Promise<Response> {
  const dbService = new D1Service(env);
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Ассистенты
    if (pathname === '/api/admin/assistants') {
      return await handleAssistants(request, dbService, corsHeaders);
    }
    
    // Диалоги
    if (pathname === '/api/admin/dialogs') {
      return await handleDialogs(request, dbService, corsHeaders);
    }
    
    // Конкретный диалог
    if (pathname.startsWith('/api/admin/dialogs/')) {
      const tgId = pathname.split('/').pop();
      if (tgId) {
        return await handleUserDialogs(request, dbService, parseInt(tgId), corsHeaders);
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error('Admin API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}


// Обработчики для ассистентов
async function handleAssistants(request: Request, dbService: D1Service, corsHeaders: any): Promise<Response> {
  if (request.method === 'GET') {
    const assistants = await dbService.getAssistants();
    return new Response(JSON.stringify(assistants), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  if (request.method === 'POST') {
    const assistant: Omit<Assistant, 'id' | 'created_at' | 'updated_at'> = await request.json();
    const result = await dbService.createAssistant(assistant);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}

// Обработчики для диалогов
async function handleDialogs(request: Request, dbService: D1Service, corsHeaders: any): Promise<Response> {
  if (request.method === 'GET') {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const dialogs = await dbService.getDialogsWithUsers(page, limit);
    return new Response(JSON.stringify(dialogs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}

async function handleUserDialogs(request: Request, dbService: D1Service, tgId: number, corsHeaders: any): Promise<Response> {
  if (request.method === 'GET') {
    const dialogs = await dbService.getUserDialogs(tgId);
    return new Response(JSON.stringify(dialogs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}