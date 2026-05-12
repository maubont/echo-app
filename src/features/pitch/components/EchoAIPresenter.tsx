import React, { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME = 'Hola. Soy el agente de presentación de Echo. Puedo explicar la visión, el producto, el modelo de negocio, los casos de uso, la privacidad, la estrategia y las proyecciones. Escríbeme una pregunta libre.';

export const EchoAIPresenter: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('conectado');
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || loading) return;

    const userMsg: Message = { role: 'user', content: msg };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);
    setStatus('consultando IA…');

    try {
      const res = await fetch('/.netlify/functions/echo-presenter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: history.slice(1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.answer) throw new Error('Respuesta inválida');

      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
      setStatus('conectado');
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'No pude conectar con el backend. Asegúrate de configurar OPENAI_API_KEY en las variables de entorno de Netlify.',
        },
      ]);
      setStatus('error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pitch-shell pitch-section" id="agente">
      <div className="pitch-ai-panel">
        <div>
          <h2>Echo Presenter AI.</h2>
          <p className="pitch-section-lead">
            Un agente real conectado a OpenAI que comprende la visión, el producto, el modelo de negocio y la estrategia de Echo. Pregúntale lo que quieras.
          </p>
          <div className="pitch-card">
            <h3>Comportamiento esperado</h3>
            <p style={{ color: 'var(--p-muted)', lineHeight: 1.6 }}>
              Responde de forma afirmativa qué es Echo. No inicia con "no es app de eventos". Explica producto, estrategia, privacidad, monetización y proyección con criterio profesional.
            </p>
          </div>
        </div>

        <div className="pitch-agent-card" aria-label="Chat con agente IA">
          <div className="pitch-agent-header">
            <div className="pitch-agent-name">
              <span className="pitch-agent-orb" />
              <span>Echo Presenter AI</span>
            </div>
            <div className="pitch-agent-status">{status}</div>
          </div>
          <div className="pitch-agent-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <div key={i} className={`pitch-msg ${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="pitch-msg assistant">Pensando…</div>}
          </div>
          <form className="pitch-agent-form" onSubmit={handleSubmit}>
            <input
              className="pitch-agent-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              placeholder="¿Qué es Echo?, ¿cómo monetiza?, ¿cómo evita el mapa vacío?..."
              disabled={loading}
            />
            <button className="pitch-agent-send" type="submit" disabled={loading}>
              Enviar
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};
