# ⚡ Salón de Estudio Colaborativo — Backend Realtime

Servidor de tiempo real desarrollado en **Node.js** con **TypeScript** y **Socket.IO**, responsable de la comunicación bidireccional continua (chat en vivo, sincronización de estados de sala y señalización WebRTC para audio/video/pantalla).

Forma parte de la **arquitectura separada de 3 proyectos independientes** (Frontend, Backend API y Backend Realtime) para el MiniProyecto 2.

---

## 🏛️ Rol en la Arquitectura

```
[ Frontend (React/Vite) ]
           │
           │ (WebSockets / Socket.IO)
           ▼
┌──────────────────────────────────────────────┐
│            Backend Realtime                  │
│  - Handshake y conexión Socket.IO            │
│  - Enrutamiento de mensajes por sala (TS-02) │
│  - Señalización WebRTC P2P (TS-03)           │
└──────────────────────────────────────────────┘
```

---

## 📋 Requisitos Previos

- **Node.js**: v20 LTS o superior.
- **npm**: v10 o superior.
- **Docker & Docker Compose** (opcional).

---

## 🚀 Ejecución en Desarrollo

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Iniciar en modo desarrollo**:
   ```bash
   npm run dev
   ```
   El servidor estará escuchando en `http://localhost:4000`.

3. **Verificar estado de salud**:
   Abre en tu navegador o terminal:
   ```bash
   curl http://localhost:4000/health
   ```
   Respuesta esperada:
   ```json
   {
     "success": true,
     "status": "UP",
     "service": "backend-realtime",
     "activeSockets": 0,
     "uptimeSeconds": 15
   }
   ```

---

## 🐳 Ejecución con Docker

```bash
# Construir imagen
docker build -t backend-realtime .

# Ejecutar contenedor
docker run -p 4000:4000 -e PORT=4000 --name salon-estudio-realtime backend-realtime
```

---

## ☁️ Despliegue en Render

1. En [Render Dashboard](https://dashboard.render.com/), crea un **New Web Service**.
2. Conecta el repositorio `miniproyecto-2PI/backend-realtime`.
3. Selecciona el runtime **Docker**.
4. En **Advanced**, define el **Health Check Path** como `/health`.
5. Variables de entorno:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` *(Render lo asigna)*
   - `CORS_ORIGIN`: `*` *(o el dominio de Vercel del Frontend)*
