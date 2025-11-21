import { D1Service } from '../db/D1Service';
import { Env } from '../index';

export async function handleAdminRequest(request: Request, env: Env, pathname: string): Promise<Response> {
  console.log('📨 Admin API called:', pathname, request.method);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dbService = new D1Service(env);

    // 🔧 ДИРЕКТ SQL ЗАПРОСЫ - самый важный endpoint
    if (pathname === '/api/admin/query' || pathname === '/api/admin/direct-query') {
      return await handleDirectQuery(request, dbService, corsHeaders);
    }

    // 📊 СТАТИСТИКА
    if (pathname === '/api/admin/stats') {
      return await handleStats(request, dbService, corsHeaders);
    }

    // 👥 ПОЛЬЗОВАТЕЛИ
    if (pathname === '/api/admin/users') {
      return await handleUsers(request, dbService, corsHeaders);
    }

    // 💬 ДИАЛОГИ
    if (pathname === '/api/admin/dialogs') {
      return await handleDialogs(request, dbService, corsHeaders);
    }

    // 🤖 АССИСТЕНТЫ
    if (pathname === '/api/admin/assistants') {
      return await handleAssistants(request, dbService, corsHeaders);
    }

    console.log('❌ Endpoint not found:', pathname);
    return new Response(JSON.stringify({ error: 'Endpoint not found', path: pathname }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Admin API error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// 🎯 ГЛАВНЫЙ МЕТОД - прямые SQL запросы
async function handleDirectQuery(request: Request, dbService: D1Service, corsHeaders: any): Promise<Response> {
  if (request.method === 'POST') {
    try {
      const { query } = await request.json();
      
      if (!query) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Query is required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('🛠️ Executing SQL:', query);
      
      const result = await dbService.db.prepare(query).all();
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: result.results || [],
        meta: result.meta
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error: any) {
      console.error('❌ SQL Error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: corsHeaders
  });
}

// 📊 СТАТИСТИКА
async function handleStats(request: Request, dbService: D1Service, corsHeaders: any): Promise<Response> {
  if (request.method === 'GET') {
    try {
      // Простые COUNT запросы
      const usersCount = await dbService.db.prepare('SELECT COUNT(*) as count FROM users').first() as any;
      const dialogsCount = await dbService.db.prepare('SELECT COUNT(*) as count FROM dialogs').first() as any;
      const assistantsCount = await dbService.db.prepare('SELECT COUNT(*) as count FROM assistants').first() as any;

      return new Response(JSON.stringify({
        users: usersCount?.count || 0,
        dialogs: dialogsCount?.count || 0,
        assistants: assistantsCount?.count || 0,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to get stats',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: corsHeaders
  });
}

// 👥 ПОЛЬЗОВАТЕЛИ
async function handleUsers(request: Request, dbService: D1Service, corsHeaders: any): Promise<Response> {
  if (request.method === 'GET') {
    try {
      const result = await dbService.db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 100').all();
      return new Response(JSON.stringify(result.results || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to get users',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: corsHeaders
  });
}

// 💬 ДИАЛОГИ
async function handleDialogs(request: Request, dbService: D1Service, corsHeaders: any): Promise<Response> {
  if (request.method === 'GET') {
    try {
      const result = await dbService.db.prepare('SELECT * FROM dialogs ORDER BY timestamp DESC LIMIT 100').all();
      return new Response(JSON.stringify(result.results || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to get dialogs',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: corsHeaders
  });
}

// 🤖 АССИСТЕНТЫ
async function handleAssistants(request: Request, dbService: D1Service, corsHeaders: any): Promise<Response> {
  if (request.method === 'GET') {
    try {
      const result = await dbService.db.prepare('SELECT * FROM assistants ORDER BY created_at DESC').all();
      return new Response(JSON.stringify(result.results || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to get assistants',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  if (request.method === 'POST') {
    try {
      const assistant = await request.json();
      const id = `assistant_${Date.now()}`;
      
      await dbService.db.prepare(
        `INSERT INTO assistants (id, name, type, system_prompt, tov_snippet, handoff_rules, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        assistant.name,
        assistant.type || 'ai',
        assistant.system_prompt,
        assistant.tov_snippet || null,
        assistant.handoff_rules || null,
        assistant.is_active ? 1 : 0
      ).run();

      const newAssistant = await dbService.db.prepare('SELECT * FROM assistants WHERE id = ?').bind(id).first();
      
      return new Response(JSON.stringify(newAssistant), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to create assistant',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: corsHeaders
  });
}