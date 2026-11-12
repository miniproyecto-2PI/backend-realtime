import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Variables fijas: las pruebas no dependen del .env local ni usan Firebase real.
    env: {
      NODE_ENV: 'test',
      CORS_ORIGIN: 'http://localhost:5173,http://localhost:8080',
      FIREBASE_SERVICE_ACCOUNT_KEY: '',
      FIREBASE_PROJECT_ID: '',
      FIREBASE_CLIENT_EMAIL: '',
      FIREBASE_PRIVATE_KEY: '',
      FIREBASE_SERVICE_ACCOUNT_PATH: '',
      GOOGLE_APPLICATION_CREDENTIALS: '',
      FIREBASE_AUTH_EMULATOR_HOST: '',
    },
    silent: 'passed-only',
  },
});
