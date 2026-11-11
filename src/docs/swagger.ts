/**
 * Especificación OpenAPI del servidor de tiempo real (servida en /api/docs).
 *
 * OpenAPI solo describe HTTP: los eventos de Socket.IO se resumen aquí y se
 * documentan completos en docs/EVENTOS_TIEMPO_REAL.md (catálogo versionado, TS-09).
 */

const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'PROFILE_INCOMPLETE',
  'NOT_FOUND',
  'ROOM_NOT_FOUND',
  'SERVICE_UNAVAILABLE',
  'INTERNAL',
];

const errorPayloadSchema = {
  type: 'object',
  required: ['code', 'message'],
  properties: {
    code: { type: 'string', enum: ERROR_CODES, example: 'VALIDATION_ERROR' },
    message: { type: 'string', example: 'El identificador de sala es obligatorio.' },
    fields: {
      type: 'object',
      nullable: true,
      additionalProperties: { type: 'string' },
      example: { roomId: 'Debe proporcionar un ID de sala válido.' },
    },
  },
};

const healthResponse = {
  '200': {
    description: 'Servicio en funcionamiento',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/RealtimeHealthResponse' } } },
  },
};

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Salón de Estudio Colaborativo - Backend Realtime',
    version: '1.1.0',
    description: `
Servidor de **tiempo real** del MiniProyecto 2 (Node.js + TypeScript + Socket.IO): chat, presencia de sala y señalización WebRTC.

### 🔐 Autenticación del handshake (TS-02)
Toda conexión Socket.IO exige el **ID token de Firebase** del usuario (el mismo proyecto que usa la API):

\`\`\`js
import { io } from 'socket.io-client';
const socket = io(VITE_REALTIME_URL, {
  // función: se vuelve a llamar en cada reconexión, así el token siempre está vigente
  auth: async (cb) => cb({ token: await auth.currentUser.getIdToken() }),
});
socket.on('connect_error', (err) => console.log(err.data?.code, err.data?.message));
\`\`\`

Sin token, o con un token inválido o vencido, la conexión se rechaza y el cliente recibe \`connect_error\` con
\`err.data = { code: 'UNAUTHENTICATED', message, fields: null }\` (o \`SERVICE_UNAVAILABLE\` si Firebase no responde).

### Eventos disponibles (v0.1)
| Evento | Emite | Datos | Ack |
|---|---|---|---|
| \`ping\` | cliente | — | \`{ ok: true, data: { serverTime, uid } }\` |
| \`join-room\` | cliente | \`roomId: string\` | \`{ ok: true, data: { roomId, joined } }\` o \`VALIDATION_ERROR\` |

Catálogo completo: **docs/EVENTOS_TIEMPO_REAL.md** en el repositorio.

### Contrato de errores (TS-05)
HTTP: \`{ error: { code, message, fields } }\`. Acks de Socket.IO: \`{ ok: false, error: { code, message, fields } }\`.
`,
    contact: { name: 'Equipo de Desarrollo MiniProyecto 2' },
  },
  servers: [{ url: '/', description: 'Servidor actual (relativo)' }],
  tags: [
    { name: 'Salud y Monitoreo (Health)', description: 'Estado del servidor y clientes conectados' },
    {
      name: 'Eventos Socket.IO (Tiempo Real)',
      description: 'Ver la descripción general y docs/EVENTOS_TIEMPO_REAL.md',
    },
  ],
  components: {
    schemas: {
      StandardErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: { error: errorPayloadSchema },
      },
      HandshakeError: {
        type: 'object',
        description:
          'Valor de `err.data` en el evento `connect_error` del cliente cuando se rechaza el handshake.',
        properties: {
          code: { type: 'string', enum: ['UNAUTHENTICATED', 'SERVICE_UNAVAILABLE'], example: 'UNAUTHENTICATED' },
          message: { type: 'string', example: 'Debes iniciar sesión para conectarte a la sala.' },
          fields: { type: 'object', nullable: true, example: null },
        },
      },
      RealtimeHealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          status: { type: 'string', example: 'UP' },
          service: { type: 'string', example: 'backend-realtime' },
          description: { type: 'string', example: 'Servidor de Tiempo Real (Socket.IO & WebRTC Signaling)' },
          environment: { type: 'string', example: 'production' },
          activeSockets: { type: 'number', example: 5 },
          uptimeSeconds: { type: 'number', example: 340 },
          timestamp: { type: 'string', format: 'date-time', example: '2026-11-06T11:00:00.000Z' },
          version: { type: 'string', example: '1.0.0' },
        },
      },
      SocketAckSuccess: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          data: { type: 'object', example: { roomId: 'ABCD234567', joined: true } },
        },
      },
      SocketAckError: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: false },
          error: errorPayloadSchema,
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Salud y Monitoreo (Health)'],
        summary: 'Estado del servidor de tiempo real',
        description: 'Estado del servicio y cantidad de clientes Socket.IO conectados. Lo usa Render como health check.',
        responses: healthResponse,
      },
    },
    '/api/health': {
      get: {
        tags: ['Salud y Monitoreo (Health)'],
        summary: 'Alias de /health bajo el prefijo /api',
        responses: healthResponse,
      },
    },
  },
};
