import React from 'react';

const problems = [
  { app: 'WhatsApp / Instagram', issue: 'Funcionan con contactos conocidos, no con oportunidades cercanas.' },
  { app: 'Google Maps', issue: 'Muestra lugares, pero no intención, presencia ni momentos activos.' },
  { app: 'Tinder / LinkedIn', issue: 'Se enfocan en un solo contexto: romance o carrera; no en el aquí y ahora multi-intención.' },
  { app: 'Marketplaces', issue: 'Publicaciones estáticas; no una experiencia viva del entorno físico.' },
];

export const ProblemSection: React.FC = () => {
  return (
    <section className="pitch-shell pitch-section pitch-two-col" id="problema">
      <div>
        <h2>El mundo físico está lleno de oportunidades invisibles.</h2>
        <p className="pitch-section-lead">
          Todos los días pasamos cerca de personas, negocios, actividades, propiedades, servicios y momentos valiosos. El problema es que no existe una capa simple para ver qué está vivo cerca, ahora mismo.
        </p>
      </div>
      <div className="pitch-card">
        <ul className="pitch-problem-list">
          {problems.map((p) => (
            <li key={p.app}>
              <span className="pitch-x">×</span>
              <span><strong>{p.app}</strong><br />{p.issue}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
