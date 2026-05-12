# 🔊 Echo — Conexiones Locales por Afinidad

Echo es una plataforma de conexión social basada en geolocalización que conecta personas en tiempo real según su ubicación, intereses y **modo de interacción**. Incluye un modo adulto con privacidad avanzada y chats efímeros.

![Echo Banner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

---

## ✨ Características Principales

### 🗺️ Mapa en Tiempo Real
- Visualiza usuarios cercanos en un mapa interactivo (Leaflet + MarkerCluster).
- Filtros por distancia (1–50 km) y categorías de interés.
- Buscador de lugares integrado (Nominatim/OpenStreetMap).
- Badge de modo activo en la barra del mapa.

### 🎭 Sistema Multi-Modo
Cada usuario puede cambiar entre 4 modos, cada uno con perfil independiente:

| Modo | Icono | Descripción |
|------|-------|-------------|
| **Networking** | 💼 | Conecta con profesionales y emprendedores |
| **Social** | ☕ | Encuentra planes y personas para salir |
| **Discovery** | 🧭 | Explora tu ciudad y conoce nuevos lugares |
| **Adulto** | 🔥 | Espacio privado y discreto. Solo para adultos |

Cada modo tiene:
- **Nickname y Bio independientes** — tu identidad cambia según el modo.
- **Categorías específicas** — Software, Marketing, Fiesta, Turismo, etc.
- **Ghost Mode** — disponible en Discovery y Adulto para hacerte invisible en el mapa.

### 🔒 Privacidad Avanzada (Modo Adulto)
- **Coordinate jittering**: tu ubicación real se desplaza ~1 km aleatoriamente.
- **Aislamiento de datos**: los usuarios solo ven a otros del mismo modo activo (RLS en Supabase).
- **Chats efímeros**: las conversaciones se autodestruyen en 24 horas.
- **Perfil separado**: tu nombre, bio y avatar en modo adulto son completamente independientes.

### 💬 Chat en Tiempo Real
- Mensajería instantánea con Supabase Realtime.
- Notificaciones de audio al recibir mensajes.
- **Chat efímero** en modo adulto con:
  - Countdown visible (horas/minutos restantes).
  - Banner de autodestrucción.
  - Indicador visual 🔥 en la lista de chats.
  - Interfaz temática roja para identificar chats privados.

### ⚡ Estados Efímeros
- Comparte tu estado actual (☕ café, 💻 trabajo, 🎉 fiesta, etc.).
- Los estados expiran automáticamente.
- Visibles como emojis flotantes en el mapa.

### 📱 PWA (Progressive Web App)
- Instalable en dispositivos móviles y de escritorio.
- Experiencia nativa sin necesidad de app stores.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 19, TypeScript, Vite 6 |
| **Estilos** | TailwindCSS 4, Lucide React (iconos) |
| **Mapas** | Leaflet + MarkerCluster |
| **Backend** | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| **Routing** | React Router v7 |
| **Despliegue** | Netlify |

---

## 📁 Estructura del Proyecto

```
src/
├── components/           # Componentes reutilizables
│   ├── layout/           # BottomNav, Layout
│   ├── map/              # StatusModal
│   └── ui/               # Button, Input, etc.
├── context/              # Contextos globales de React
│   ├── AuthContext.tsx    # Autenticación + user_mode_profiles
│   ├── PresenceContext.tsx # Broadcasting de ubicación + Ghost Mode
│   └── ThemeContext.tsx   # Temas claro/oscuro
├── features/             # Páginas principales
│   ├── auth/             # Login, Register
│   ├── chat/             # ChatPage (con chat efímero)
│   ├── home/             # HomePage
│   ├── map/              # MapPage (mapa interactivo)
│   ├── profile/          # ProfilePage (multi-modo)
│   └── splash/           # SplashScreen
├── hooks/                # Custom hooks
│   ├── useGeoLocation.ts # Geolocalización del navegador
│   └── usePWAInstall.ts  # Detección de instalación PWA
├── lib/                  # Utilidades y tipos
│   ├── constants.tsx     # Categorías, iconos, labels, descripciones por modo
│   ├── supabase.ts       # Cliente Supabase
│   └── types.ts          # TypeScript interfaces
├── services/             # Servicios de datos
│   ├── chat.ts           # CRUD conversaciones + mensajes + chat efímero
│   ├── location.ts       # Broadcasting y fetch de ubicaciones + jittering
│   ├── presence.ts       # Servicio de presencia
│   └── status.ts         # Estados efímeros de usuario
└── styles/               # CSS global y temas
```

---

## 🗄️ Base de Datos (Supabase)

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfil global del usuario (nombre, bio, avatar, modo actual) |
| `user_mode_profiles` | Perfiles por modo (nickname, bio, avatar, ghost_mode) |
| `user_locations` | Ubicaciones en tiempo real con modo activo |
| `conversations` | Conversaciones con `mode` y `expires_at` para chat efímero |
| `conversation_participants` | Participantes por conversación |
| `messages` | Mensajes de chat |
| `user_statuses` | Estados efímeros (emoji + texto + expiración) |

### Migraciones SQL

Los siguientes scripts deben ejecutarse en orden en el SQL Editor de Supabase:

1. `database.sql` — Esquema base (tablas, índices, RLS)
2. `setup_chat_security.sql` — Políticas de seguridad para chat
3. `full_security_patch.sql` — Parche completo de seguridad
4. `fix_chat_rpc.sql` — RPC para creación atómica de conversaciones
5. `add_adult_mode_schema.sql` — Tabla `user_mode_profiles`, aislamiento por modo, campo `expires_at`
6. `ephemeral_chat.sql` — RPC actualizado con `conv_mode` y `conv_expires_at`, función de limpieza

### Row Level Security (RLS)
- Los usuarios solo ven ubicaciones de otros usuarios **en el mismo modo activo**.
- Los mensajes solo son accesibles por los participantes de la conversación.
- Las conversaciones expiradas se filtran automáticamente.

---

## 🔧 Instalación y Ejecución

### Requisitos
- Node.js v18+
- NPM
- Cuenta en [Supabase](https://supabase.com)

### Setup

```bash
# 1. Clonar el repositorio
git clone https://github.com/maubont/echo-app.git
cd echo-app

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales de Supabase
```

### Variables de Entorno

Crear archivo `.env.local` en la raíz (debe ser UTF-8, sin BOM):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

> ⚠️ **Importante**: El archivo `.env.local` debe estar codificado en UTF-8. Si usas PowerShell para crearlo, asegúrate de no guardarlo en UTF-16 (BOM), ya que Vite no podrá leerlo.

### Desarrollo Local

```bash
npm run dev
# → http://localhost:3000
```

### Build de Producción

```bash
npm run build
npm run preview
```

---

## 🚀 Despliegue

La aplicación está configurada para despliegue en **Netlify**:

1. Conecta el repositorio de GitHub a Netlify.
2. Configura las variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. **Build command**: `npm run build`
4. **Publish directory**: `dist`
5. Configurar la URL del sitio en Supabase → Authentication → URL Configuration para redirección de emails.

---

## 🗺️ Roadmap

- [x] Sistema multi-modo (Networking, Social, Discovery, Adulto)
- [x] Perfiles independientes por modo
- [x] Ghost Mode (invisibilidad en mapa)
- [x] Coordinate jittering para modo adulto
- [x] Chat efímero con autodestrucción de 24h
- [x] Estados efímeros en el mapa
- [x] PWA instalable
- [ ] Notificaciones push
- [ ] Verificación de edad para modo adulto
- [ ] Galería de fotos por modo
- [ ] Sistema de matchmaking por afinidades
- [ ] Planes grupales y eventos

---

## 📄 Licencia

Desarrollado con ❤️ por **Mauricio Bonilla**.

© 2026 Echo. Todos los derechos reservados.
