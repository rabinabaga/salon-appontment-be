// config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  name: process.env.DATABASE_NAME,
  port: parseInt(process.env.DATABASE_PORT ?? '27017', 10),
}));