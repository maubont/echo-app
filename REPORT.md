# Echo — Architecture Report

> **Última actualización**: 2026-05-11 (v0.3.0)

## Arquitectura

Echo sigue una arquitectura **Feature-First** con React + TypeScript + Vite:

```
src/
├── components/       → UI reutilizable (Button, Input, BottomNav, StatusModal)
├── context/          → Estado global (Auth, Presence, Theme)
├── features/         → Páginas principales (auth, chat, home, map, profile, splash)
├── hooks/            → Custom hooks (useGeoLocation, usePWAInstall)
├── lib/              → Tipos, constantes, cliente Supabase
├── services/         → Capa de datos (chat, location, presence, status)
└── styles/           → CSS global y temas
```

## Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | React | 19.2 |
| Build | Vite | 6.4 |
| Lenguaje | TypeScript | 5.x |
| Estilos | TailwindCSS | 4.x |
| Mapas | Leaflet + MarkerCluster | 1.9 |
| Iconos | Lucide React | 0.554 |
| Routing | React Router DOM | 7.9 |
| Backend | Supabase (Auth, DB, Realtime) | 2.84 |
| Despliegue | Netlify | — |

## Decisiones de Diseño

### Multi-Modo
- 4 modos: `networking`, `social`, `discovery`, `adult`
- Cada modo tiene perfil independiente en tabla `user_mode_profiles` (nickname, bio, avatar, ghost)
- El `current_mode` en `profiles` determina qué modo está activo
- RLS en Supabase aísla datos por modo

### Privacidad (Modo Adulto)
- **Coordinate jittering**: ~1km de desplazamiento aleatorio en `location.ts`
- **Ghost Mode**: invisibilidad en mapa vía `PresenceContext`
- **RLS estricto**: `user_locations` y `profiles` filtran por modo
- **Chat efímero**: 24h TTL en `conversations.expires_at`

### Chat
- Creación atómica vía RPC `create_new_conversation` (evita race conditions)
- Helper `is_chat_participant()` (evita recursión RLS)
- Mensajes bloqueados si la conversación expiró
- Realtime vía Supabase channels

### Migraciones SQL
- **Desde cero**: Ejecutar `migrations/001_consolidated_schema.sql`
- **Incremental**: Los archivos individuales en la raíz documentan la historia de cambios

## Historial de Refactorizaciones

1. **v0.1.0** — Migración de monolito `index.tsx` → arquitectura modular
2. **v0.2.0** — Integración Supabase real (Auth, Realtime, RLS), chat en tiempo real
3. **v0.3.0** — Multi-modo, modo adulto, chat efímero, privacidad avanzada
