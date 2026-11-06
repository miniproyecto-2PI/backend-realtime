## 📋 Descripción
<!-- Describe brevemente qué hace este PR, la funcionalidad que añade o el problema que resuelve en Realtime. -->

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
- [ ] Servidor Socket.IO responde conexión exitosamente
- [ ] Health check `/health` respondiendo 200 OK
- [ ] Eventos probados con clientes concurrentes

## 🚀 Cómo probar
```bash
npm install
npm run dev
curl http://localhost:4000/health
```

