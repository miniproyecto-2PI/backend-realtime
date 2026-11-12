# ⚡ Salón de Estudio Colaborativo — Backend Realtime

Servidor de tiempo real en **Node.js + TypeScript** con **Socket.IO**: chat en vivo, presencia de sala y señalización WebRTC (audio, video y pantalla). Toda conexión exige el **ID token de Firebase** del usuario, verificado con **Firebase Admin SDK**. Se despliega en **Render** con Docker.

Forma parte de una arquitectura de 3 proyectos independientes: `FrontEnd` (Vercel), `BackEnd` (API REST) y `backend-realtime` (este repositorio).

| Sprint | Estado |
|---|---|
| 0 | Servidor Socket.IO base, health check, contrato de errores (TS-05) |
| 1 | **Handshake autenticado** con Firebase, CORS restringido, catálogo de eventos v0.1, pruebas y CI |
| 2 → 5 | Salas y chat (TS-02), presencia y reconexión (TS-09), señalización WebRTC (TS-03), estados de media |

---

## 🏛️ Rol en la arquitectura

```
[ Frontend (React, Vercel) ]
        │  Socket.IO  ·  auth: { token: <ID token de Firebase> }
        ▼
┌──────────────────────────────────────────────┐
│ backend-realtime                              │
│  1. CORS: solo orígenes de CORS_ORIGIN        │
│  2. io.use(): verifica el ID token (Admin SDK)│ ➔ rechaza con connect_error UNAUTHENTICATED
│  3. Eventos: ping, join-room, …               │ ➔ acks { ok, data } / { ok:false, error }
└──────────────────────────────────────────────┘
```

---

## 📚 Catálogo de eventos

Los nombres, emisores, datos y acks de **todos** los eventos están en **[docs/EVENTOS_TIEMPO_REAL.md](docs/EVENTOS_TIEMPO_REAL.md)** (documento versionado, TS-09). Cualquier evento nuevo se agrega ahí antes de programarlo.

Conexión desde el frontend:

```ts
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_REALTIME_URL, {
  // función: se vuelve a llamar en cada reconexión, así el token siempre está vigente
  auth: async (cb) => cb({ token: await auth.currentUser!.getIdToken() }),
});
socket.on('connect_error', (err) => console.log(err.data?.code, err.data?.message));
```

---

## 📦 Requisitos

- **Node.js 20** o superior (la imagen Docker y la CI usan Node 20) y **npm 10** o superior.
- **Docker** (opcional).
- Credenciales del **mismo proyecto de Firebase** que usa el Backend API.

---

## 📂 Estructura

```bash
backend-realtime/
├── .github/workflows/ci.yml       # Lint, tipos, build, pruebas y docker build en cada PR
├── docs/EVENTOS_TIEMPO_REAL.md    # Catálogo de eventos (fuente única)
├── Dockerfile · render.yaml
├── eslint.config.mjs · vitest.config.ts · tsconfig.test.json
├── tests/                         # Vitest + socket.io-client + Supertest (sin Firebase)
└── src/
    ├── server.ts                  # Punto de entrada: listen y apagado controlado
    ├── realtime.ts                # createRealtimeServer(deps): Express + Socket.IO + auth
    ├── app.ts                     # Express: CORS, Swagger, health, 404
    ├── config/                    # env.ts, firebase.ts (Admin SDK, solo Auth), cors.ts
    ├── services/token.verifier.ts # Verificación del ID token (inyectable)
    ├── sockets/                   # authMiddleware.ts (handshake), socketHandler.ts (eventos)
    ├── docs/swagger.ts            # Swagger UI en /api/docs
    ├── middlewares/errorHandler.ts
    ├── routes/health.routes.ts
    └── types/                     # errors.types.ts, auth.types.ts
```

---

## 🔑 Variables de entorno

```bash
cp .env.example .env
```

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NODE_ENV` · `PORT` · `HOST` | No | Por defecto `development` · `4000` · `0.0.0.0` (Render inyecta `PORT`) |
| `CORS_ORIGIN` | **Sí en producción** | Orígenes permitidos (HTTP y Socket.IO), separados por coma. `*` **no** se acepta; se admite `*` dentro de un segmento del host para previews de Vercel |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Una de las opciones | JSON de la cuenta de servicio en una línea (**recomendado en Render**) |
| `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` | Una de las opciones | Credenciales por separado |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Una de las opciones | Ruta a un JSON local (ignorado por git) |
| `FIREBASE_AUTH_EMULATOR_HOST` | No | Emulador local de Firebase Auth |
| `STUN_SERVER_URL` | No (Sprint 4) | Servidor STUN/TURN para WebRTC |

Sin credenciales el servidor arranca y `/health` responde, pero **todas** las conexiones Socket.IO se rechazan con `SERVICE_UNAVAILABLE`.

---

## 🚀 Ejecución local

```bash
npm install
npm run dev        # http://localhost:4000 con recarga automática
npm run build && npm start
curl http://localhost:4000/health
```

---

## 🐳 Docker

```bash
docker build -t backend-realtime .
docker run -p 4000:4000 --env-file .env backend-realtime
```

---

## 🧪 Pruebas, lint y CI

```bash
npm test             # Vitest: levanta Socket.IO real en un puerto libre
npm run test:watch
npm run lint
npm run typecheck    # tipos de src/ y tests/
```

Las pruebas no usan Firebase: inyectan un verificador de tokens en memoria ([tests/helpers.ts](tests/helpers.ts)).

| Archivo | Qué comprueba |
|---|---|
| `tests/handshake.test.ts` | Sin token, token alterado o vencido → `UNAUTHENTICATED`; token por `auth.token`, `auth()` o `Authorization: Bearer`; `socket.data.user`; `SERVICE_UNAVAILABLE` |
| `tests/events.test.ts` | `ping` (ack y `pong`), `join-room` válido e inválido con el formato de ack TS-05 |
| `tests/http.test.ts` | Health, 404 TS-05, CORS de HTTP y del transporte de Socket.IO, Swagger |

**CI:** [.github/workflows/ci.yml](.github/workflows/ci.yml) corre `npm ci`, lint, typecheck, build, pruebas y `docker build` en cada pull request y push a `main`/`develop`.

---

## ☁️ Despliegue en Render

1. *New Web Service* conectado a `miniproyecto-2PI/backend-realtime`, runtime **Docker** (o usar `render.yaml`).
2. **Health Check Path:** `/health`.
3. Variables de entorno:
   - `NODE_ENV=production`, `HOST=0.0.0.0` (Render asigna `PORT`)
   - `CORS_ORIGIN` = URL del frontend en Vercel
   - `FIREBASE_SERVICE_ACCOUNT_KEY` = JSON de la cuenta de servicio (**mismo proyecto que el Backend API**)

---

## 📖 Swagger

- **Swagger UI:** `/api/docs` (`/docs` y `/api-docs` redirigen aquí) · **JSON:** `/api/docs.json`.
- OpenAPI describe solo HTTP (health). La autenticación del handshake y los eventos se resumen en la descripción del Swagger y se documentan completos en [docs/EVENTOS_TIEMPO_REAL.md](docs/EVENTOS_TIEMPO_REAL.md).

---

## 🛡️ Contrato de errores (TS-05)

| Canal | Formato |
|---|---|
| HTTP | `{ "error": { "code", "message", "fields" } }` |
| Ack de eventos | `{ "ok": false, "error": { "code", "message", "fields" } }` · éxito: `{ "ok": true, "data": { … } }` |
| Handshake rechazado | `connect_error` con `err.data = { code: 'UNAUTHENTICATED' \| 'SERVICE_UNAVAILABLE', message, fields: null }` |
