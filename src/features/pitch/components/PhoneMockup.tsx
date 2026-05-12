import React, { useState } from 'react';

export const PhoneMockup: React.FC = () => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="pitch-phone">
      <div className="pitch-screen">
        <div className="pitch-screen-top">
          <div>
            <div className="pitch-screen-title">Hola, Palmus 👋</div>
            <div className="pitch-screen-state">
              <span style={{ color: 'var(--p-green)' }}>●</span> En línea
            </div>
          </div>
          <div className="pitch-avatar">E</div>
        </div>

        <div className="pitch-phone-card">
          <div className="pitch-phone-label">
            {visible ? 'Networking activo' : 'Explorando cerca'}
          </div>
          <h3>{visible ? 'Estás visible' : 'Estás oculto'}</h3>
          <p>
            {visible
              ? 'Tu presencia aproximada se muestra por tiempo limitado. Puedes ocultarte cuando quieras.'
              : 'Puedes ver lo que pasa cerca sin exponerte. Solo apareces cuando decides participar.'}
          </p>
          <button className="pitch-phone-button" onClick={() => setVisible(!visible)}>
            {visible ? 'Ocultarme ahora' : 'Hacerme visible'}
          </button>
        </div>

        <div className="pitch-phone-grid">
          <div className="pitch-phone-tile">
            <div><div className="emoji">📍</div><strong>Explorar</strong><span>mapa vivo</span></div>
          </div>
          <div className="pitch-phone-tile">
            <div><div className="emoji">💬</div><strong>Conectar</strong><span>sin compartir número</span></div>
          </div>
        </div>

        <div className="pitch-nearby">
          <div className="pitch-nearby-title">Activo cerca</div>
          <div className="pitch-chips">
            <span className="pitch-chip">⚽ micro</span>
            <span className="pitch-chip">🏠 arriendo</span>
            <span className="pitch-chip">☕ café</span>
            <span className="pitch-chip">🤝 networking</span>
          </div>
        </div>
      </div>
    </div>
  );
};
