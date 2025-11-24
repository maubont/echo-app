# Proxi App

Proxi App es una plataforma de redes sociales basada en geolocalización que conecta a las personas en tiempo real según su ubicación y modo de interacción (Networking, Dating, Amigos, Eventos).

![Proxi App Banner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## 🚀 Características Principales

- **Geolocalización en Tiempo Real**: Visualiza usuarios cercanos en un mapa interactivo.
- **Modos de Interacción**: Cambia tu perfil según lo que buscas: Networking, Citas, Amistad o Eventos.
- **Chat Seguro**: Mensajería instantánea privada con seguridad a nivel de fila (RLS).
- **Estados Efímeros**: Comparte lo que estás haciendo o buscando con estados que expiran automáticamente.
- **Perfil Público**: Muestra tu información relevante según el modo seleccionado.

## 🛠️ Stack Tecnológico

- **Frontend**: React 18, TypeScript, Vite
- **Estilos**: TailwindCSS, Lucide React (Iconos)
- **Mapas**: Leaflet, React-Leaflet
- **Backend & Base de Datos**: Supabase (PostgreSQL, Auth, Realtime)
- **Despliegue**: Netlify

## 📋 Requisitos Previos

- Node.js (v18 o superior)
- NPM o Yarn
- Cuenta en Supabase (para desarrollo local completo)

## 🔧 Instalación y Ejecución

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/maubont/proxi-app.git
   cd proxi-app
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   Crea un archivo `.env` en la raíz del proyecto con tus credenciales de Supabase:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
   ```

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:3000`.

## 🔒 Seguridad

La aplicación utiliza **Row Level Security (RLS)** de PostgreSQL para asegurar que los datos de los usuarios estén protegidos y solo sean accesibles por las partes autorizadas.

## 📱 PWA (Progressive Web App)

Proxi App está configurada como una PWA, lo que permite instalarla en dispositivos móviles y de escritorio para una experiencia nativa.

---

Desarrollado con ❤️ por Mauricio.
