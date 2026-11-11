import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { startTestServer, TestServer } from './helpers';
import { swaggerSpec } from '../src/docs/swagger';

// CORS_ORIGIN de prueba (vitest.config.ts): http://localhost:5173, http://localhost:8080
describe('HTTP del servidor de tiempo real', () => {
  let server: TestServer;
  const ACAO = 'access-control-allow-origin';

  beforeAll(async () => {
    server = await startTestServer();
  });
  afterAll(async () => {
    await server.close();
  });

  it('el health check responde aunque Firebase no esté configurado', async () => {
    const res = await request(server.httpServer).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'UP', service: 'backend-realtime', activeSockets: expect.any(Number) });
  });

  it('404 con el formato estándar TS-05', async () => {
    const res = await request(server.httpServer).get('/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String), fields: null } });
  });

  it('CORS HTTP: permite un origen de la lista', async () => {
    const res = await request(server.httpServer).get('/health').set('Origin', 'http://localhost:5173');
    expect(res.headers[ACAO]).toBe('http://localhost:5173');
  });

  it('CORS HTTP: bloquea un origen fuera de la lista', async () => {
    const res = await request(server.httpServer).get('/health').set('Origin', 'https://sitio-malicioso.example');
    expect(res.headers[ACAO]).toBeUndefined();
  });

  it('CORS Socket.IO: el transporte polling solo autoriza orígenes de la lista', async () => {
    const ok = await request(server.httpServer)
      .get('/socket.io/?EIO=4&transport=polling')
      .set('Origin', 'http://localhost:8080');
    expect(ok.headers[ACAO]).toBe('http://localhost:8080');

    const blocked = await request(server.httpServer)
      .get('/socket.io/?EIO=4&transport=polling')
      .set('Origin', 'https://sitio-malicioso.example');
    expect(blocked.headers[ACAO]).toBeUndefined();
  });

  it('Swagger documenta la autenticación del handshake', () => {
    expect(swaggerSpec.info.description).toContain('ID token de Firebase');
    expect(swaggerSpec.components.schemas.HandshakeError).toBeDefined();
  });
});
