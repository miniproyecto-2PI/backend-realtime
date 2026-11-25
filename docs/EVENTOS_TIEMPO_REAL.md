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

### `room:join` y presencia (US-08)

El cliente autenticado envía `{ roomId }`. También se admite el ID como cadena y el alias anterior `join-room`. El servidor recorta espacios y comprueba en Firestore que la sala exista y admita ingresos. Un intento fallido conserva la sala anterior.

| Evento | Destinatario | Datos |
|---|---|---|
| `room:participants` | Socket que ingresa | `{ roomId, participants: [{ uid, name, avatar }] }` |
| `room:user-joined` | Otros sockets de la sala | `{ roomId, participant: { uid, name, avatar } }` al entrar la primera conexión del usuario |
| `room:user-left` | Otros sockets de la sala | El mismo formato al salir la última conexión del usuario, por desconexión o cambio de sala |

El ack de ingreso tiene el formato `{ ok: true, data: { roomId, joined: true } }`. Los errores usan `{ ok: false, error: { code, message, fields } }`. Un ID inválido devuelve `VALIDATION_ERROR`, uno inexistente o en eliminación devuelve `ROOM_NOT_FOUND` y una consulta fallida devuelve `DATABASE_ERROR`.

En la vista de sala, registrar los listeners de presencia antes de conectar. El cliente conserva el ID de la ruta y solicita el ingreso en cada conexión, incluida la reconexión. Debe reemplazar su lista local al recibir `room:participants`. Ejemplo con un socket creado con `autoConnect: false` y el token de la sesión:

```ts
socket.on('connect', () => {
  socket.emit('room:join', { roomId }, (res) => {
    if (!res.ok) mostrarError(res.error.message);
  });
});
socket.connect();
```

---

## 4. Próximos eventos (planificados, aún no implementados)

Nombres propuestos por el backlog. Se confirman aquí cuando se programan.

| Evento | Sprint | Historia |
|---|---|---|
| Señalización WebRTC (oferta/respuesta SDP, candidatos ICE) | 4 | TS-03, US-12 |
| Estados de media (micrófono, cámara, pantalla) | 5 | US-13, US-14 |

## US-07 · Cambios de una sala

Ambos servicios deben apuntar al mismo proyecto Firebase. Realtime observa el documento
`rooms/{roomId}` mientras el canal tiene clientes. Los eventos los emite el servidor
a los sockets autenticados que usaron `join-room` para esa sala.

| Evento | Datos | Acción del cliente |
|---|---|---|
| `room:updated` | `{ roomId, name }` | Mostrar el nombre persistido. Se envía al abrir el observador y cuando cambia el nombre. |
| `room:deleted` | `{ roomId }` | Mostrar «El anfitrión eliminó la sala» y volver al dashboard. El servidor retira a los clientes del canal después de emitir. |
| `room:error` | `{ roomId, code: 'DATABASE_ERROR' }` | Mostrar un error y permitir reintentar con `join-room` después de cerrar el observador. |

## US-10 · Mensajería instantánea

| Evento | Quién lo emite | Quién lo recibe | Datos |
|---|---|---|---|
| `chat:send` | Cliente autenticado y unido con `room:join` | Servidor | `{ roomId, text, clientMessageId? }` |
| `chat:message` | Servidor tras confirmar la escritura | Todos los sockets de la sala, incluido el emisor | `{ id, roomId, text, author: { uid, name, avatar }, createdAt }` |

El texto admite de 1 a 1000 puntos de código Unicode tras recortar espacios en los extremos. Conserva los saltos de línea interiores. El servidor obtiene el autor de la sesión y persiste su hora en Firestore como Timestamp en `rooms/{roomId}/messages/{id}`. El evento entrega la hora en formato ISO UTC.

El ack exitoso contiene `{ ok: true, data: { id } }`. La interfaz puede reconciliar el mensaje pendiente con el evento usando ese ID. Para reintentar un envío sin confirmación, reutilizar el mismo `clientMessageId` (por ejemplo, un UUID creado al redactar). En la misma sala y para el mismo autor, repetir el ID y texto devuelve el ID guardado sin volver a emitir; reutilizarlo con otro texto devuelve un error.

Los errores usan `{ ok: false, error: { code, message, fields } }`. Los códigos son `VALIDATION_ERROR` para datos inválidos, `FORBIDDEN` si el socket no pertenece al canal, `ROOM_NOT_FOUND` si la sala desapareció o está en eliminación y `DATABASE_ERROR` si falla la persistencia. Un handshake sin sesión ya se rechaza con `connect_error`.

```js
// Ejecutar después del ack exitoso de room:join.
socket.on('chat:message', message => console.log(message.author.name, message.text));
const draft = { roomId, text: 'Hola, grupo', clientMessageId: crypto.randomUUID() };
socket.timeout(5000).emit('chat:send', draft, (timeout, ack) => {
  if (timeout || !ack.ok) return console.log('Pendiente de reintento', draft);
  console.log('Guardado', ack.data.id);
});
```

## US-11 · Integración del historial y del chat en vivo

1. Registrar el listener de `chat:message` antes de solicitar `room:join`. Tras el ack de ingreso, pedir `GET /api/rooms/{id}/messages` a la API REST con el token de sesión. Conservar los eventos de la sala recibidos mientras llega la respuesta.
2. Leer `data.messages`, ya en orden cronológico. Cada entrada comparte con `chat:message` los campos `id`, `roomId`, `author`, `text` y `createdAt`. Combinar por ID dentro de la sala, incluyendo el mensaje propio. Para fechas iguales, respetar el orden por ID del historial.
3. Si `data.hasMore` es verdadero, usar `data.nextBefore` en `?before=...` para pedir la página anterior e insertarla al principio conservando la posición de lectura. El límite por defecto y máximo es 50.
4. Al cambiar de sala, descartar las respuestas pendientes de la sala anterior. Si falla la consulta, mantener activa la suscripción y permitir reintentar el cursor. Al reconectar, volver a unirse y reconciliar desde la página más reciente; si hicieron falta más de 50 mensajes, seguir paginando hasta encontrar un ID conocido o agotar el historial.
