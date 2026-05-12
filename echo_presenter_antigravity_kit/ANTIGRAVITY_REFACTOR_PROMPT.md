# Prompt para Google Antigravity — Convertir monolito Echo en experiencia profesional

## Rol

Actúa como un equipo senior de producto, diseño, frontend, arquitectura y growth. Tu objetivo es tomar la carpeta de base ubicada en la raíz del proyecto Echo y convertirla en una experiencia profesional, innovadora, elegante y mantenible dentro de la app.

Debes pensar con estándar de presentación tipo Steve Jobs, estrategia tipo Y Combinator y profundidad técnica tipo equipo senior de producto.

---

## Archivos de entrada

La carpeta contiene:

- `echo_presenter_monolith.html`
- `ECHO_APP_CONTEXT_FULL.md`
- `ANTIGRAVITY_REFACTOR_PROMPT.md`

Lee primero `ECHO_APP_CONTEXT_FULL.md`. Ese archivo contiene la verdad estratégica del producto.

---

## Tesis obligatoria

Echo debe entenderse y presentarse así:

> **Echo es una capa de presencia en tiempo real sobre el mundo físico.**

Pregunta central:

> **“Estoy aquí, ahora mismo… ¿qué está pasando a mi alrededor y con quién o con qué vale la pena conectar?”**

Frase clave:

> **Echo hace visible lo invisible.**

No presentar Echo como app de eventos.  
No abrir respuestas diciendo “Echo no es app de eventos”.  
Los eventos solo se mencionan si el usuario pregunta por ellos o si aparecen como caso natural dentro de una lista amplia de contextos.

---

## Objetivo de implementación

Convertir el HTML monolítico en una experiencia frontend profesional dentro del proyecto React/TypeScript existente.

Debe poder funcionar como:

1. Landing/pitch interactivo para presentar Echo.
2. Página interna o ruta pública de demo.
3. Base visual para un agente IA real de presentación.
4. Experiencia sofisticada para inversionistas, aliados y usuarios tempranos.

---

## Requisitos de producto

La experiencia debe comunicar:

- Echo como capa de presencia sobre el mundo físico.
- Personas, lugares, momentos y oportunidades activas cerca.
- Uso desde casa, barrio, zona social, turismo, deportes, vivienda, café, networking y privado.
- Explorar sin exponerse.
- Hacerse visible solo si el usuario lo decide.
- Privacidad por diseño.
- Modelo de negocio por usuarios, lugares y oportunidades.
- Unidad económica por zona viva.
- Agente IA capaz de responder preguntas libres.

---

## Requisitos de diseño

Crear una interfaz:

- sofisticada;
- elegante;
- oscura/neón controlada;
- estilo premium, no plantilla genérica;
- responsive;
- con microanimaciones suaves;
- con mapas abstractos;
- con puntos vivos;
- con mockup de celular;
- con tarjetas limpias;
- con tipografía fuerte;
- con muy poco texto por bloque visual;
- con buen contraste;
- con jerarquía visual clara.

Paleta recomendada:

```css
--bg: #05060F;
--bg-2: #080B18;
--ink: #F8FBFF;
--muted: #AEB7CC;
--blue: #5D6BFF;
--cyan: #27D7FF;
--purple: #A851FF;
--green: #45F0A0;
--pink: #FF4FD8;
--orange: #FFB547;
```

---

## Requisitos de arquitectura frontend

Refactorizar el monolito hacia componentes React/TypeScript:

Sugerencia de estructura:

```txt
src/features/pitch/
  PitchLandingPage.tsx
  components/
    PitchNav.tsx
    HeroSection.tsx
    LivingMapVisual.tsx
    PhoneMockup.tsx
    ProblemSection.tsx
    UseCasesSection.tsx
    HowItWorksSection.tsx
    LayersSection.tsx
    CompetitiveSection.tsx
    BusinessModelSection.tsx
    UnitEconomicsSection.tsx
    EchoAIPresenter.tsx
  data/
    pitchContent.ts
  styles/
    pitch.css
```

También puedes adaptar la estructura existente de la app si ya hay convenciones definidas.

---

## Ruta sugerida

Crear una ruta pública o semipública:

```txt
/pitch
```

También puede usarse:

```txt
/demo
/echo-pitch
```

Si el proyecto ya usa React Router, integrarlo correctamente.

---

## Agente IA

No debe ser una simulación con preguntas predefinidas.

Debe ser un chat libre con campo de texto, conectado a backend seguro.

### Frontend esperado

Componente:

```tsx
<EchoAIPresenter />
```

Debe:

- mostrar bienvenida natural;
- permitir preguntas libres;
- guardar historial de conversación local;
- mostrar estado: conectado / pensando / error;
- no incluir API keys;
- llamar a un endpoint backend seguro.

### Endpoint esperado

Puede ser:

```txt
/api/echo-presenter
```

O una Supabase Edge Function:

```txt
/functions/v1/echo-presenter
```

Selecciona la opción más coherente con el stack actual.

Payload:

```json
{
  "message": "¿Qué es Echo?",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Respuesta:

```json
{
  "answer": "..."
}
```

---

## Seguridad del agente

Nunca exponer `OPENAI_API_KEY` en frontend.

Usar variables de entorno del backend:

```env
OPENAI_API_KEY=
OPENAI_MODEL=
```

Si se usa Netlify:

```txt
netlify/functions/echo-presenter.ts
```

Si se usa Supabase:

```txt
supabase/functions/echo-presenter/index.ts
```

El backend debe construir el system prompt con base en `ECHO_APP_CONTEXT_FULL.md`, resumido o convertido en knowledge base.

---

## Prompt base del agente IA

El backend debe usar un system prompt con estas reglas:

```txt
Eres Echo Presenter AI, un agente experto en presentar, defender y explicar Echo.

Echo es una capa de presencia en tiempo real sobre el mundo físico. Responde la pregunta:
"Estoy aquí, ahora mismo… ¿qué está pasando a mi alrededor y con quién o con qué vale la pena conectar?"

Tu primera respuesta ante "¿Qué es Echo?" debe ser afirmativa y directa:
"Echo es una capa de presencia en tiempo real sobre el mundo físico..."

No empieces diciendo "Echo no es una app de eventos".
No centres la narrativa en eventos.
Solo menciona eventos si el usuario pregunta por ellos o si aparecen como un ejemplo más entre muchos.

Debes dominar:
- visión del producto;
- casos de uso cotidianos;
- capas: personas, lugares, momentos, oportunidades;
- modos: networking, social, discovery, privado;
- privacidad por diseño;
- monetización;
- unidad económica por zona viva;
- competencia;
- riesgos;
- mitigaciones;
- go-to-market por microzonas;
- respuesta a objeciones.

Tono:
- claro;
- estratégico;
- seguro;
- natural;
- elegante;
- sin exageraciones falsas;
- sin vender humo;
- con mentalidad YC / producto / inversionista.
```

---

## Respuestas esperadas del agente

### Pregunta: ¿Qué es Echo?

Respuesta esperada:

> Echo es una capa de presencia en tiempo real sobre el mundo físico. Te permite descubrir qué personas, lugares, momentos y oportunidades están activos cerca de ti, según tu contexto e intención. Puedes explorar lo que pasa alrededor sin exponerte y solo hacerte visible cuando decides participar.

### Pregunta: ¿Cómo evita Echo el mapa vacío?

Respuesta esperada:

> Echo no depende solo de usuarios visibles. El mapa se organiza en capas: personas, lugares, momentos y oportunidades. Aunque haya pocos usuarios visibles al inicio, puede mostrar cafés activos, promociones, actividades, vivienda, servicios o zonas con movimiento. Primero hacemos útil el mapa; luego lo llenamos de interacción social.

### Pregunta: ¿Echo sirve para eventos?

Respuesta esperada:

> Sí, puede usarse naturalmente en eventos porque un evento es un lugar con alta concentración de personas e intención. Pero la visión de Echo es más amplia: funciona en cualquier lugar físico donde haya algo que descubrir, como barrios, cafés, universidades, zonas sociales, turismo, deportes, vivienda, negocios y comunidades.

---

## Requisitos de contenido en la landing

Incluir secciones:

1. Hero:
   - “El pulso vivo de lo que pasa cerca de ti.”
   - “Capa de presencia en tiempo real sobre el mundo físico.”
   - pregunta central.

2. Problema:
   - oportunidades invisibles en el mundo físico.

3. Solución:
   - Echo convierte el entorno cercano en una capa viva.

4. Casos cotidianos:
   - microfútbol/basket;
   - vivienda/arriendos;
   - cafés/trabajo;
   - social/planes;
   - privado +18 con seguridad.

5. Cómo funciona:
   - explorar;
   - filtrar;
   - hacerse visible;
   - conectar/sumarse.

6. Capas:
   - personas;
   - lugares;
   - momentos;
   - oportunidades.

7. Ventaja competitiva:
   - Google Maps;
   - WhatsApp;
   - Tinder;
   - LinkedIn;
   - marketplaces;
   - Echo.

8. Modelo de negocio:
   - usuarios;
   - lugares/negocios;
   - oportunidades/listings.

9. Unidad económica:
   - zona viva;
   - $4,7M COP/mes base conservadora.

10. Agente IA:
   - chat libre;
   - backend seguro;
   - sin preguntas predefinidas.

---

## Criterios de aceptación visual

- Debe verse profesional en desktop y móvil.
- No debe parecer plantilla común.
- No debe tener tablas con letra diminuta.
- Las tablas deben poder convertirse en tarjetas si mejora la lectura.
- El agente no debe tener botones de preguntas predefinidas.
- El copy principal no debe centrarse en eventos.
- El modo privado no debe dominar la narrativa.
- El hero debe comunicar en menos de 10 segundos qué es Echo.
- Debe sentirse como “ciudad viva / capa digital / radar de presencia”.

---

## Criterios de aceptación técnica

- Build exitoso.
- Sin errores TypeScript.
- Sin API keys en frontend.
- Componentes separados.
- Datos de contenido extraídos a objetos/arrays.
- CSS organizado o compatible con Tailwind si el proyecto lo usa.
- Accesibilidad básica:
  - labels;
  - contrastes;
  - navegación por teclado;
  - estados de carga/error;
  - aria-labels donde aplique.

---

## Tareas sugeridas

1. Leer contexto completo.
2. Revisar estructura actual del proyecto.
3. Crear feature `pitch`.
4. Refactorizar HTML a React.
5. Crear componentes.
6. Mejorar diseño visual.
7. Implementar chat UI libre.
8. Crear backend seguro para OpenAI si el entorno lo permite.
9. Si no se puede crear backend completo, dejar interfaz clara y contrato de API.
10. Probar build.
11. Documentar cómo ejecutar y configurar.

---

## Resultado esperado

Una experiencia de pitch/demo de Echo que pueda mostrarse a Palmus, inversionistas o aliados, y que sirva como base para integrar un agente IA real.

Debe sentirse como una presentación viva, no como un documento plano.

Mensaje final:

> **Echo hace visible lo invisible: personas, lugares, momentos y oportunidades activas cerca de ti, en tiempo real.**
