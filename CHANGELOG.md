# Changelog

Todos los cambios importantes del proyecto Echo se documentan aquí.

## [0.3.0] — 2026-05-11

### ✨ Chat Efímero (Modo Adulto)
- Conversaciones en modo `adult` expiran automáticamente en **24 horas**.
- UI temática roja: banner de autodestrucción, countdown visible, ícono 🔥 en lista de chats.
- RPC `create_new_conversation` actualizado con parámetros `conv_mode` y `conv_expires_at`.
- Función `cleanup_expired_conversations()` para limpieza periódica en Supabase.
- Conversaciones expiradas se filtran automáticamente de la lista.

### 🎭 Sistema Multi-Modo Completo
- Modos actualizados: **Networking**, **Social**, **Discovery**, **Adulto**.
- `constants.tsx` reescrito con categorías, iconos (`Briefcase`, `Coffee`, `Compass`, `Flame`), labels y descripciones.
- ProfilePage muestra nickname y bio **por modo**, no solo datos globales.
- Badge de modo activo visible en la barra superior del mapa.
- Descripción del modo visible al seleccionarlo en el perfil.

### 🔒 Privacidad Avanzada
- **Coordinate jittering** en modo adulto (~1 km de desplazamiento aleatorio).
- **Ghost Mode** integrado en PresenceContext — usuarios invisibles no transmiten ubicación.
- **Aislamiento por modo** — RLS en `user_locations` filtra por `current_mode`.
- Perfil adulto completamente independiente (nickname, bio, avatar).

### 🐛 Correcciones
- Corregido encoding de `.env.local` (UTF-16 → UTF-8) que impedía cargar variables de entorno.
- Corregido import de `useContext` no utilizado en ProfilePage.
- Mejorada la carga de nombres/avatares reales en marcadores del mapa.
- Agregado spinner visual al guardar perfil.

---

## [0.2.0] — 2026-05-11

### 🗺️ Mapa Interactivo
- Integración con Leaflet + MarkerCluster para visualizar usuarios cercanos.
- Filtros por distancia y categorías.
- Buscador de lugares (Nominatim).
- Indicador de presencia (punto azul).

### 💬 Chat en Tiempo Real
- Mensajería instantánea con Supabase Realtime.
- Creación atómica de conversaciones (RPC).
- Row Level Security para mensajes y conversaciones.
- Notificaciones de audio.

### ⚡ Estados Efímeros
- Estados con emoji + texto que expiran automáticamente.
- Visibles como badges flotantes en marcadores del mapa.

---

## [0.1.0] — 2026-05-10

### 🚀 Lanzamiento Inicial
- Autenticación con Supabase (email/contraseña).
- Perfil de usuario con avatar, bio, categorías.
- Sistema de modos básico (`current_mode` en `profiles`).
- Geolocalización en tiempo real.
- Progressive Web App (PWA) instalable.
- Temas claro/oscuro.
- Diseño glassmorphism con TailwindCSS 4.
