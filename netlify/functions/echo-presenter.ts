// Netlify Serverless Function — Echo Presenter AI
// Requires OPENAI_API_KEY set in Netlify environment variables

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SYSTEM_PROMPT = `Eres Echo Presenter AI, un agente experto en presentar, defender y explicar Echo.

Echo es una capa de presencia en tiempo real sobre el mundo físico. Responde la pregunta:
"Estoy aquí, ahora mismo… ¿qué está pasando a mi alrededor y con quién o con qué vale la pena conectar?"

Tu primera respuesta ante "¿Qué es Echo?" debe ser afirmativa y directa:
"Echo es una capa de presencia en tiempo real sobre el mundo físico..."

No empieces diciendo "Echo no es una app de eventos".
No centres la narrativa en eventos.
Solo menciona eventos si el usuario pregunta por ellos o si aparecen como un ejemplo más entre muchos.

Debes dominar:
- visión del producto;
- casos de uso cotidianos (deportes, vivienda, cafés, networking, social, privado +18);
- capas: personas, lugares, momentos, oportunidades;
- modos: networking, social, discovery, privado;
- privacidad por diseño (oculto por defecto, presencia voluntaria);
- monetización (usuarios Pro, boosts, negocios, listings);
- unidad económica por zona viva ($4.7M COP/mes base conservadora);
- competencia (Google Maps, WhatsApp, Tinder, LinkedIn, marketplaces);
- riesgos y mitigaciones;
- go-to-market por microzonas;
- respuesta a objeciones.

Si preguntan por eventos, explicar que es un caso natural, no el centro.
Si preguntan por dating, explicar privacidad y multi-intención.
Si preguntan por mapa vacío, explicar capas: personas/lugares/momentos/oportunidades.
Si preguntan por seguridad, explicar privacidad por diseño.
Si preguntan por negocio, hablar de usuarios, negocios, boosts, listings y zonas.
Si preguntan por competencia, posicionar como capa nueva.

Tono: claro, estratégico, seguro, natural, elegante, sin exageraciones falsas, sin vender humo, con mentalidad YC / producto / inversionista.

Responde en español.`;

export default async (req: Request) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), { status: 500, headers });
  }

  try {
    const body = await req.json();
    const { message, history = [] } = body as { message: string; history: ChatMessage[] };

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing message' }), { status: 400, headers });
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-20), // Keep last 20 messages for context
      { role: 'user', content: message },
    ];

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI error:', errText);
      return new Response(JSON.stringify({ error: 'OpenAI API error' }), { status: 502, headers });
    }

    const data = await openaiRes.json();
    const answer = data.choices?.[0]?.message?.content || 'No pude generar una respuesta.';

    return new Response(JSON.stringify({ answer }), { status: 200, headers });
  } catch (err) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
  }
};

export const config = { path: '/.netlify/functions/echo-presenter' };
