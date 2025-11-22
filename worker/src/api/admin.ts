import { Env } from '../index';

interface QueryRequest {
query: string;
}

interface AssistantRequest {
name: string;
type: string;
system_prompt: string;
is_active: boolean;
}

export async function handleAdminRequest(request: Request, env: Env, pathname: string): Promise<Response> {
console.log('🔧 Admin API called:', pathname);

const corsHeaders = {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
'Access-Control-Allow-Headers': 'Content-Type',
};

if (request.method === 'OPTIONS') {
return new Response(null, { headers: corsHeaders });
}

try {
// 🗃️ DIRECT SQL QUERY
if (pathname === '/api/admin/query') {
if (request.method === 'POST') {
const body: QueryRequest = await request.json() as QueryRequest;
const query = body.query;
    // Базовая защита от опасных операций
    const trimmedQuery = query.trim().toLowerCase();
    if (trimmedQuery.startsWith('drop') || 
        trimmedQuery.startsWith('delete') || 
        trimmedQuery.startsWith('update') ||
        trimmedQuery.startsWith('insert') ||
        trimmedQuery.startsWith('alter')) {
      return new Response(JSON.stringify({ 
        error: 'Dangerous queries are not allowed in admin panel' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('📊 Executing SQL:', query);
    
    const result = await env.DB.prepare(query).all();
    return new Response(JSON.stringify({ 
      success: true, 
      data: result.results || [] 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
    status: 405, 
    headers: corsHeaders 
  });
}

// 👥 USERS
if (pathname === '/api/admin/users') {
  if (request.method === 'GET') {
    const result = await env.DB.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 50').all();
    return new Response(JSON.stringify(result.results || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
    status: 405, 
    headers: corsHeaders 
  });
}

// 💬 DIALOGS
if (pathname === '/api/admin/dialogs') {
  if (request.method === 'GET') {
    const result = await env.DB.prepare('SELECT * FROM dialogs ORDER BY timestamp DESC LIMIT 50').all();
    return new Response(JSON.stringify(result.results || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
    status: 405, 
    headers: corsHeaders 
  });
}

// 🤖 ASSISTANTS
if (pathname === '/api/admin/assistants') {
  if (request.method === 'GET') {
    const result = await env.DB.prepare('SELECT * FROM assistants ORDER BY created_at DESC').all();
    return new Response(JSON.stringify(result.results || []), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  if (request.method === 'POST') {
    const assistant: AssistantRequest = await request.json() as AssistantRequest;
    const id = `assistant_${Date.now()}`;
    
    await env.DB.prepare(
      `INSERT INTO assistants (id, name, type, system_prompt, is_active)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      id,
      assistant.name,
      assistant.type || 'ai',
      assistant.system_prompt,
      assistant.is_active ? 1 : 0
    ).run();

    const newAssistant = await env.DB.prepare('SELECT * FROM assistants WHERE id = ?').bind(id).first();
    return new Response(JSON.stringify(newAssistant), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
    status: 405, 
    headers: corsHeaders 
  });
}

// 📊 STATS
if (pathname === '/api/admin/stats') {
  if (request.method === 'GET') {
    const users = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first() as { count: number };
    const dialogs = await env.DB.prepare('SELECT COUNT(*) as count FROM dialogs').first() as { count: number };
    const assistants = await env.DB.prepare('SELECT COUNT(*) as count FROM assistants').first() as { count: number };

    return new Response(JSON.stringify({
      users: users?.count || 0,
      dialogs: dialogs?.count || 0,
      assistants: assistants?.count || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
    status: 405, 
    headers: corsHeaders 
  });
}

// ❌ NOT FOUND
console.log('❌ Endpoint not found:', pathname);
return new Response(JSON.stringify({ error: 'Endpoint not found', path: pathname }), {
  status: 404,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
} catch (error: any) {
console.error('💥 Admin API error:', error);
return new Response(JSON.stringify({ error: 'Internal error', details: error.message }), {
status: 500,
headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
}
}