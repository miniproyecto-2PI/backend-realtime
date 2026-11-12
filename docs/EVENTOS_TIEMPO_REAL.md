# Catálogo de eventos de tiempo real

| Versión | Fecha | Sprint | Cambios |
|---|---|---|---|
| 0.1 | 2026-11-11 | Sprint 1 | Handshake autenticado con Firebase, `ping`, `join-room`, `disconnect` |

Este documento es la fuente única para nombres de eventos, quién los emite y qué datos llevan. El frontend y el backend-realtime **deben** usar exactamente estos nombres. Cada evento nuevo de los sprints 2 a 5 (chat, presencia, WebRTC, estados de media) se agrega aquí antes de programarlo (TS-09).

---

## 1. Conexión y autenticación del handshake

El servidor rechaza cualquier conexión sin un **ID token de Firebase** válido. Debe ser del mismo proyecto de Firebase que usa el Backend API.

### Cómo se conecta el frontend

```ts
import { io } from 'socket.io-client';
import { getAuth } from 'firebase/auth';

const socket = io(import.meta.env.VITE_REALTIME_URL, {
  // Se pasa una función (no un objeto fijo): Socket.IO la vuelve a llamar en cada
  // reconexión, así el token siempre está vigente (los ID tokens vencen en 1 hora).
  auth: async (cb) => cb({ token: await getAuth().currentUser!.getIdToken() }),
});

socket.on('connect', () => console.log('Conectado', socket.id));
socket.on('connect_error', (err) => {
  // err.data sigue el contrato de errores TS-05
  console.log(err.data?.code, err.data?.message);
});
```

Como alternativa (clientes que no son navegador), el token puede ir en el encabezado `Authorization: Bearer <token>`.

### Resultado del handshake

| Caso | Resultado en el cliente |
|---|---|
| Token válido | Evento `connect`. El servidor guarda `socket.data.user = { uid, email, name, picture, signInProvider }` |
| Sin token | `connect_error` con `err.data = { code: 'UNAUTHENTICATED', message: 'Debes iniciar sesión para conectarte a la sala.', fields: null }` |
| Token inválido o alterado | `connect_error` con `code: 'UNAUTHENTICATED'` y "Tu sesión no es válida. Inicia sesión de nuevo." |
| Token vencido | `connect_error` con `code: 'UNAUTHENTICATED'` y "Tu sesión expiró. Inicia sesión de nuevo." |
| Firebase no responde o no está configurado | `connect_error` con `code: 'SERVICE_UNAVAILABLE'` |
| Origen no permitido (CORS) | El navegador bloquea la conexión. El origen debe estar en `CORS_ORIGIN` |

> Tras un `connect_error` por `UNAUTHENTICATED`, Socket.IO **no** reintenta solo. El frontend debe pedir a la persona que inicie sesión de nuevo (o refrescar el token y llamar `socket.connect()`).

---

## 2. Formato de las confirmaciones (ack)

Todo evento que acepta callback responde con el mismo formato (TS-05):

```jsonc
// Éxito
{ "ok": true, "data": { /* depende del evento */ } }

// Error
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "texto en español", "fields": { "campo": "mensaje" } } }
```

---

## 3. Eventos

### `ping`

| | |
|---|---|
| Emite | Cliente |
| Datos | Ninguno |
| Ack | `{ ok: true, data: { serverTime: string (ISO), uid: string } }` |
| Sin callback | El servidor emite `pong` al mismo socket con la misma respuesta |
| Uso | Diagnóstico de conexión y latencia |

```ts
socket.emit('ping', (res) => console.log(res.data.serverTime));
```

### `join-room`

| | |
|---|---|
| Emite | Cliente |
| Datos | `roomId: string` (no vacío) |
| Ack éxito | `{ ok: true, data: { roomId, joined: true } }` |
| Ack error | `{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'El identificador de sala es obligatorio.', fields: { roomId: '…' } } }` |
| Estado | **Base del Sprint 1.** En el Sprint 2 (TS-02) se agrega la validación de que la sala existe en Firestore (`ROOM_NOT_FOUND`) y los eventos de presencia |

```ts
socket.emit('join-room', 'ABCD234567', (res) => {
  if (!res.ok) return mostrarError(res.error.message);
});
```

### `disconnect`

| | |
|---|---|
| Emite | Socket.IO (automático) |
| Uso | El servidor registra la salida en el log. En el Sprint 3 (TS-09) se emitirá `room:user-left` a la sala |

---

## 4. Próximos eventos (planificados, aún no implementados)

Nombres propuestos por el backlog. Se confirman aquí cuando se programan.

| Evento | Sprint | Historia |
|---|---|---|
| `room:participants`, `room:user-joined`, `room:user-left` | 3 | TS-09, US-08 |
| `room:deleted` | 3 | US-07 |
| Envío y recepción de mensajes de chat | 3 | US-10, US-11 |
| Señalización WebRTC (oferta/respuesta SDP, candidatos ICE) | 4 | TS-03, US-12 |
| Estados de media (micrófono, cámara, pantalla) | 5 | US-13, US-14 |
