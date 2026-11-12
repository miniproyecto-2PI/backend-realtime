## 📋 Descripción
<!-- Describe brevemente qué hace este PR, la funcionalidad que añade o el problema que resuelve en Realtime. -->

**Historia:** <!-- p. ej. TS-02 --> · **Rama:** `feature/TS-XX-...` · **Sprint:** <!-- N -->

## 🛠️ Tipo de PR (PR Type)
- [ ] 🚀 **Feature** (WebSockets / Signaling / Eventos)
- [ ] 🐛 **Fix** (Corrección de error)
- [ ] 🧪 **Test** (Pruebas añadidas o actualizadas)
- [ ] ♻️ **Refactor** (Reestructuración sin alterar comportamiento)
- [ ] 📝 **Docs** (Documentación de eventos)
- [ ] 🔧 **Chore** (Configuración, Docker, dependencias)

## 🔍 Cambios realizados
- `src/sockets/` — <!-- Manejadores de eventos de Socket.IO / WebRTC -->
- `src/routes/` — <!-- Rutas HTTP de salud o diagnóstico -->
- `src/config/` — <!-- Variables y configuración -->
- `Dockerfile` / `docker-compose.yml` — <!-- Infraestructura -->

## 🧪 Calidad y Validaciones
- [ ] `npm run build` (Compilación TypeScript sin errores)
- [ ] `npm run lint` y `npm run typecheck` sin errores
- [ ] `npm test` (Pruebas Vitest pasando; CI en verde)
- [ ] Servidor Socket.IO responde conexión exitosamente
- [ ] Health check `/health` respondiendo 200 OK
- [ ] Eventos probados con clientes concurrentes
- [ ] `docs/EVENTOS_TIEMPO_REAL.md` actualizado si se agregó o cambió un evento

## 🚀 Cómo probar
```bash
npm install
npm run dev
curl http://localhost:4000/health
```

## 📸 Evidencias
<!-- Capturas de consola del cliente, logs de Render o video corto (con la URL de producción visible cuando aplique) -->

## 🤖 Uso de IA
<!-- Obligatorio según el enunciado: declara si usaste IA, para qué y qué revisaste tú. -->
- [ ] No se usó IA
- [ ] Se usó IA: <!-- herramienta y en qué partes -->

