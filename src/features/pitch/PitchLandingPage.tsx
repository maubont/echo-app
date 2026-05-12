import React from 'react';
import { PitchNav } from './components/PitchNav';
import { HeroSection } from './components/HeroSection';
import { ProblemSection } from './components/ProblemSection';
import { LivingMapVisual } from './components/LivingMapVisual';
import { EchoAIPresenter } from './components/EchoAIPresenter';
import './styles/pitch.css';

/* ---------- Data arrays ---------- */
const useCases = [
  { emoji: '⚽', title: 'Deportes ahora', desc: '"Estoy en Cali, quiero jugar microfútbol o basket. ¿Dónde hay gente cerca y puedo unirme?"' },
  { emoji: '🏠', title: 'Vivienda local', desc: '"Estoy visitando un barrio. ¿Hay casas o apartamentos en arriendo o venta cerca?"' },
  { emoji: '☕', title: 'Lugares vivos', desc: '"Quiero trabajar o tomar café. ¿Qué lugares cercanos tienen ambiente activo ahora?"' },
  { emoji: '🔒', title: 'Privado +18', desc: 'Conexiones personales entre adultos, con verificación, ubicación aproximada, bloqueo, reporte y control.' },
];

const steps = [
  { title: 'Abres Echo', desc: 'Exploras personas, lugares y oportunidades cerca.' },
  { title: 'Filtras por interés', desc: 'Deportes, vivienda, social, networking, lugares, privado, servicios.' },
  { title: 'Te haces visible solo si quieres', desc: 'Presencia voluntaria, temporal y contextual.' },
  { title: 'Contactas o te sumas', desc: 'Mensaje, solicitud, visita, reserva, cupón, "quiero unirme".' },
];

const layers = [
  { emoji: '👥', title: 'Personas', desc: 'Usuarios visibles con intención: networking, social, discovery o privado.' },
  { emoji: '🏪', title: 'Lugares', desc: 'Cafés, bares, coworkings, tiendas, gimnasios, hostales y zonas activas.' },
  { emoji: '⚡', title: 'Momentos', desc: 'Partidos, promociones, planes, actividades espontáneas y estados efímeros.' },
  { emoji: '💎', title: 'Oportunidades', desc: 'Arriendos, ventas, servicios, empleo local, negocios y comunidades cercanas.' },
];

const competitors = [
  { name: 'Google Maps', items: ['Lugares', 'Rutas', 'No intención'] },
  { name: 'WhatsApp', items: ['Contactos', 'Grupos', 'No descubrimiento local'] },
  { name: 'Tinder', items: ['Dating', 'Match lento', 'Una intención'] },
  { name: 'Marketplaces', items: ['Listados', 'Búsqueda fría', 'No presencia viva'] },
];

const businessCards = [
  { pill: 'Usuarios', title: 'Pro + Boosts', items: ['Filtros avanzados.', 'Mayor radio.', 'Más solicitudes.', 'Boosts de visibilidad.'] },
  { pill: 'Lugares', title: 'Negocios activos', items: ['Perfil destacado.', 'Promociones.', 'Métricas.', 'Campañas por zona.'] },
  { pill: 'Oportunidades', title: 'Listings locales', items: ['Vivienda.', 'Servicios.', 'Actividades.', 'Zonas patrocinadas.'] },
];

const unitEcon = [
  { source: 'Usuarios Pro', assumption: '100 × $19.900', revenue: '$1,99M COP' },
  { source: 'Negocios Pro', assumption: '15 × $99.000', revenue: '$1,48M COP' },
  { source: 'Boosts', assumption: '200 × $5.000', revenue: '$1,0M COP' },
  { source: 'Listings/promos', assumption: '10 × $30.000', revenue: '$0,3M COP' },
  { source: 'Total zona', assumption: 'Base conservadora', revenue: '$4,7M COP/mes' },
];

export const PitchLandingPage: React.FC = () => {
  return (
    <div className="pitch-page">
      <PitchNav />

      <main>
        <HeroSection />
        <ProblemSection />
        <LivingMapVisual />

        {/* Use Cases */}
        <section className="pitch-shell pitch-section" id="casos">
          <h2>Casos cotidianos que crean hábito.</h2>
          <p className="pitch-section-lead">Echo debe ser útil desde la casa, en una visita a otro barrio, caminando por una zona social o explorando una ciudad nueva.</p>
          <div className="pitch-cases">
            {useCases.map((c) => (
              <article key={c.title} className="pitch-case-card">
                <div className="emoji">{c.emoji}</div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="pitch-shell pitch-section pitch-two-col">
          <div>
            <h2>Cómo funciona.</h2>
            <p className="pitch-section-lead">La experiencia debe sentirse natural: primero exploras el entorno; luego decides si quieres participar.</p>
          </div>
          <div className="pitch-steps">
            {steps.map((s, i) => (
              <div key={i} className="pitch-step">
                <div><strong>{s.title}</strong><span>{s.desc}</span></div>
              </div>
            ))}
          </div>
        </section>

        {/* Layers */}
        <section className="pitch-shell pitch-section">
          <h2>Capas del entorno.</h2>
          <p className="pitch-section-lead">El diferencial de Echo es que no depende de una sola categoría. Organiza el mundo cercano por capas de intención.</p>
          <div className="pitch-layers">
            {layers.map((l) => (
              <div key={l.title} className="pitch-layer-card">
                <div className="emoji">{l.emoji}</div>
                <h3>{l.title}</h3>
                <p>{l.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Competitive */}
        <section className="pitch-shell pitch-section">
          <h2>Ventaja competitiva.</h2>
          <p className="pitch-section-lead">Echo crea una capa nueva entre el mapa, la red social y el marketplace local.</p>
          <div className="pitch-comparison">
            {competitors.map((c) => (
              <div key={c.name} className="pitch-comp-card">
                <h3>{c.name}</h3>
                <ul>{c.items.map((it) => <li key={it}>{it}</li>)}</ul>
              </div>
            ))}
            <div className="pitch-comp-card pitch-echo">
              <h3>Echo</h3>
              <ul><li>Aquí y ahora</li><li>Multi-intención</li><li>Personas + lugares + oportunidades</li></ul>
            </div>
          </div>
        </section>

        {/* Business Model */}
        <section className="pitch-shell pitch-section" id="negocio">
          <h2>Modelo de negocio.</h2>
          <p className="pitch-section-lead">Echo monetiza donde hay proximidad, intención y necesidad de visibilidad.</p>
          <div className="pitch-business">
            {businessCards.map((b) => (
              <div key={b.pill} className="pitch-card">
                <span className="pitch-pill">{b.pill}</span>
                <h3>{b.title}</h3>
                <ul>{b.items.map((it) => <li key={it}>{it}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        {/* Unit Economics */}
        <section className="pitch-shell pitch-section pitch-two-col">
          <div>
            <h2>Unidad económica: una zona viva.</h2>
            <p className="pitch-section-lead">El modelo se valida de abajo hacia arriba: primero una microzona que se siente viva; luego se replica por ciudad.</p>
          </div>
          <div className="pitch-unit-table">
            <table>
              <thead><tr><th>Fuente</th><th>Supuesto</th><th>Ingreso mensual</th></tr></thead>
              <tbody>
                {unitEcon.map((u) => (
                  <tr key={u.source}>
                    <td><strong>{u.source}</strong></td>
                    <td>{u.assumption}</td>
                    <td>{u.source === 'Total zona' ? <strong>{u.revenue}</strong> : u.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* AI Agent */}
        <EchoAIPresenter />

        {/* CTA Final */}
        <section className="pitch-shell pitch-section" style={{ textAlign: 'center' }}>
          <h2><span className="pitch-gradient">Echo hace visible lo invisible.</span></h2>
          <p className="pitch-section-lead" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
            Personas, lugares, momentos y oportunidades activas en tiempo real. No para vivir más dentro del teléfono, sino para descubrir mejor el mundo físico alrededor.
          </p>
          <div className="pitch-actions" style={{ justifyContent: 'center' }}>
            <a className="pitch-btn pitch-btn-primary" href="#inicio">Volver al inicio</a>
            <a className="pitch-btn pitch-btn-secondary" href="#agente">Preguntar al agente</a>
          </div>
        </section>
      </main>

      <footer className="pitch-footer pitch-shell">
        Echo · Palmus.co · {new Date().getFullYear()}
      </footer>
    </div>
  );
};
