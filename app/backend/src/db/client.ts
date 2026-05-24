import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL 未配置');

// 单例连接池
// Supabase 免费版总连接数 60；max:10 适合单实例 Render 部署
const client = postgres(url, {
  prepare:         false,   // Supabase pooler 不支持 prepared statements
  max:             10,
  idle_timeout:    20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export type DrizzleDb = typeof db;
