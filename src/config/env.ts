import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const parsePort = (val?: string): number => {
  const parsed = Number(val);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 4000;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parsePort(process.env.PORT),
  HOST: process.env.HOST || '0.0.0.0',
  // Lista separada por comas. '*' no se acepta (ver config/cors.ts).
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8080',
};

