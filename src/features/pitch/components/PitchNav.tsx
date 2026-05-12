import React from 'react';

const navLinks = [
  { href: '#problema', label: 'Problema' },
  { href: '#solucion', label: 'Solución' },
  { href: '#casos', label: 'Casos' },
  { href: '#negocio', label: 'Negocio' },
  { href: '#agente', label: 'Agente IA' },
];

export const PitchNav: React.FC = () => {
  return (
    <nav className="pitch-nav">
      <a className="pitch-brand" href="#inicio" aria-label="Echo">
        <span className="pitch-brand-mark" aria-hidden="true" />
        <span>Echo</span>
      </a>
      <div className="pitch-nav-links">
        {navLinks.map((l) => (
          <a key={l.href} href={l.href}>{l.label}</a>
        ))}
      </div>
      <a className="pitch-nav-cta" href="#agente">Preguntar a Echo AI</a>
    </nav>
  );
};
