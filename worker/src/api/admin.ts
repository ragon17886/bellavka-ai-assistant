import { D1Service } from '../db/D1Service';
import { Env } from '../index';

export async function handleAdminRequest(request: Request, env: Env, pathname: string): Promise<Response> {
  console.log('🔧 Admin API called:', pathname);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const dbService = new D1Service(env);

  try {
    // 🗃️ DIRECT SQL QUERY
    if (pathname === '/api/admin/query') {
      if (request.method === 'POST') {
        const { query } = await request.json();
        console.log('📊 Executing SQL:', query);
        
        const result = await dbService.db.prepare(query).all();
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
        const result = await dbService.db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 50').all();
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
        const result = await dbService.db.prepare('SELECT * FROM dialogs ORDER BY timestamp DESC LIMIT 50').all();
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
        const result = await dbService.db.prepare('SELECT * FROM assistants ORDER BY created_at DESC').all();
        return new Response(JSON.stringify(result.results || []), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (request.method === 'POST') {
        const assistant = await request.json();
        const id = `assistant_${Date.now()}`;
        
        await dbService.db.prepare(
          `INSERT INTO assistants (id, name, type, system_prompt, is_active)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          id,
          assistant.name,
          assistant.type || 'ai',
          assistant.system_prompt,
          assistant.is_active ? 1 : 0
        ).run();

        const newAssistant = await dbService.db.prepare('SELECT * FROM assistants WHERE id = ?').bind(id).first();
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
        const users = await dbService.db.prepare('SELECT COUNT(*) as count FROM users').first() as any;
        const dialogs = await dbService.db.prepare('SELECT COUNT(*) as count FROM dialogs').first() as any;
        const assistants = await dbService.db.prepare('SELECT COUNT(*) as count FROM assistants').first() as any;

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