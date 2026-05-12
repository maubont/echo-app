import React from 'react';
import { PhoneMockup } from './PhoneMockup';

export const HeroSection: React.FC = () => {
  return (
    <section className="pitch-shell pitch-section pitch-hero" id="inicio">
      <div>
        <div className="pitch-eyebrow">
          <span className="pitch-live-dot" />
          Capa de presencia en tiempo real sobre el mundo físico
        </div>
        <h1><span className="pitch-gradient">El pulso vivo</span> de lo que pasa cerca de ti.</h1>
        <p className="pitch-lead">
          Echo permite descubrir personas, lugares, momentos y oportunidades activas alrededor de ti, según tu contexto e intención.
        </p>
        <div className="pitch-quote-core">
          "Estoy aquí, ahora mismo… ¿qué está pasando a mi alrededor y con quién o con qué vale la pena conectar?"
        </div>
        <div className="pitch-actions" style={{ marginTop: 30 }}>
          <a className="pitch-btn pitch-btn-primary" href="#solucion">Ver experiencia</a>
          <a className="pitch-btn pitch-btn-secondary" href="#agente">Hablar con el agente IA</a>
        </div>
      </div>

      <div className="pitch-hero-visual" aria-label="Mockup visual de Echo">
        <div className="pitch-radar" aria-hidden="true" />
        <span className="pitch-pulse-pin pitch-pin-a" />
        <span className="pitch-pulse-pin pitch-pin-b" />
        <span className="pitch-pulse-pin pitch-pin-c" />
        <span className="pitch-pulse-pin pitch-pin-d" />
        <PhoneMockup />
      </div>
    </section>
  );
};
