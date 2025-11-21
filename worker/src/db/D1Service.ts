import { D1Service } from '../db/D1Service';
import { Env } from '../index';

export async function handleAdminRequest(request: Request, env: Env, pathname: string): Promise<Response> {
  const dbService = new D1Service(env);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Существующие endpoints
    if (pathname === '/api/admin/assistants') {
      return await handleAssistants(request, dbService, corsHeaders);
    }
    
    if (pathname === '/api/admin/dialogs') {
      return await handleDialogs(request, dbService, corsHeaders);
    }
    
    if (pathname === '/api/admin/stats') {
      return await handleStats(request, dbService, corsHeaders);
    }
    
    // НОВЫЙ endpoint для прямых SQL запросов
    if (pathname === '/api/admin/direct-query') {
      return await handleDirectQuery(request, dbService, corsHeaders);
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

// НОВЫЙ обработчик для прямых SQL запросов
async function handleDirectQuery(request: Request, dbService: D1Service, corsHeaders: any): Promise<Response> {
  if (request.method === 'POST') {
    try {
      const { query } = await request.json();
      
      if (!query) {
        return new Response(JSON.stringify({ success: false, error: 'Query is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('Executing direct query:', query);
      
      // Выполняем запрос напрямую через D1
      const result = await dbService.db.prepare(query).all();
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: result.results || [],
        meta: result.meta
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error: any) {
      console.error('Direct query error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}

// Существующие обработчики (должны быть уже в файле)
async function handleAssistants(request: Request, dbService: D1Service, corsHeaders: any): Promise<Response> {
  if (request.method === 'GET') {
    const assistants = await dbService.getAssistants();
    return new Response(JSON.stringify(assistants), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  if (request.method === 'POST') {
    try {
      const assistant = await request.json();
      const result = await dbService.createAssistant(assistant);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to create assistant' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}

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

async function handleStats(request: Request, dbService: D1Service, corsHeaders: any): Promise<Response> {
  if (request.method === 'GET') {
    const stats = await dbService.getSimpleStats();
    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
}