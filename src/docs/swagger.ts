export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Salón de Estudio Colaborativo - Backend Realtime',
    version: '1.0.0',
    description: `
API y Documentación del Servidor de **Tiempo Real** para el MiniProyecto 2: **Salón de Estudio Colaborativo**.
Implementado en **Node.js + TypeScript** con **Socket.IO** y **Express**.

### Funcionalidades:
- **WebSockets (Socket.IO)**: Comunicación bidireccional continua, chat y sincronización de estados de sala (Sprint 2 - TS-02).
- **WebRTC Signaling**: Intercambio de ofertas/respuestas SDP y candidatos ICE para audio, video y pantalla (Sprint 4 - TS-03).
- **TS-05**: Respuestas de error estructuradas con formato \`{ error: { code, message, fields } }\`.
    `,
    contact: {
      name: 'Equipo de Desarrollo MiniProyecto 2',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Servidor Actual (Relativo)',
    },
  ],
  tags: [
    {
      name: 'Salud y Monitoreo (Health)',
      description: 'Monitoreo de estado del servidor de tiempo real y clientes conectados',
    },
    {
      name: 'Eventos Socket.IO (Tiempo Real)',
      description: 'Documentación de eventos bidireccionales y confirmaciones (ack)',
    },
    {
      name: 'Contrato de Errores (TS-05)',
      description: 'Estándar uniforme de errores y acks',
    },
  ],
  components: {
    schemas: {
      StandardErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: {
                type: 'string',
                enum: [
                  'VALIDATION_ERROR',
                  'UNAUTHENTICATED',
                  'FORBIDDEN',
                  'PROFILE_INCOMPLETE',
                  'NOT_FOUND',
                  'ROOM_NOT_FOUND',
                  'INTERNAL',
                ],
                example: 'VALIDATION_ERROR',
              },
              message: {
                type: 'string',
                example: 'Los datos enviados son inválidos.',
              },
              fields: {
                type: 'object',
                nullable: true,
                additionalProperties: { type: 'string' },
                example: { roomId: 'El identificador de sala es obligatorio.' },
              },
            },
          },
        },
      },
      RealtimeHealthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          status: { type: 'string', example: 'UP' },
          service: { type: 'string', example: 'backend-realtime' },
          description: {
            type: 'string',
            example: 'Servidor de Tiempo Real (Socket.IO & WebRTC Signaling)',
          },
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
          data: {
            type: 'object',
            example: { serverTime: '2026-11-06T11:00:00.000Z' },
          },
        },
      },
      SocketAckError: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'El identificador de sala es obligatorio.' },
              fields: {
                type: 'object',
                example: { roomId: 'Debe proporcionar un ID de sala válido.' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Salud y Monitoreo (Health)'],
        summary: 'Verifica el estado del servidor de tiempo real',
        description:
          'Retorna el estado del servicio y la cantidad de clientes WebSockets conectados activamente.',
        responses: {
          '200': {
            description: 'Servicio en funcionamiento',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RealtimeHealthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['Salud y Monitoreo (Health)'],
        summary: 'Alias de verificación de salud bajo el prefijo /api',
        responses: {
          '200': {
            description: 'Servicio en funcionamiento',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RealtimeHealthResponse' },
              },
            },
          },
        },
      },
    },
  },
};
