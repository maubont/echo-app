import React from 'react';

const tags = [
  { cls: 'pitch-tag-1', emoji: '🤝', text: 'Aliado cerca' },
  { cls: 'pitch-tag-2', emoji: '🏠', text: 'Apt. en arriendo' },
  { cls: 'pitch-tag-3', emoji: '⚽', text: 'Falta uno para micro' },
  { cls: 'pitch-tag-4', emoji: '☕', text: 'Café activo' },
  { cls: 'pitch-tag-5', emoji: '🏪', text: 'Promo local' },
];

export const LivingMapVisual: React.FC = () => {
  return (
    <section className="pitch-shell pitch-section pitch-two-col" id="solucion">
      <div className="pitch-living-map" aria-label="Mapa vivo conceptual">
        {tags.map((t) => (
          <span key={t.cls} className={`pitch-tag ${t.cls}`}>{t.emoji} {t.text}</span>
        ))}
      </div>
      <div>
        <h2>Echo convierte tu entorno cercano en una capa viva de información útil.</h2>
        <p className="pitch-section-lead">
          No es solo un mapa. Es una capa de presencia contextual: personas, lugares, momentos y oportunidades que aparecen cuando son relevantes para ti.
        </p>
        <div className="pitch-quote-core">
          Antes veías calles y lugares. Con Echo ves lo que está pasando alrededor.
        </div>
      </div>
    </section>
  );
};
