import type { D1Like } from '../env.ts';
export const now = () => Date.now();
/** Atalhos com queries SEMPRE parametrizadas (nunca concatenar dados do usuário em SQL). */
export const one = <T>(db: D1Like, sql: string, ...args: unknown[]) => db.prepare(sql).bind(...args).first<T>();
export const all = async <T>(db: D1Like, sql: string, ...args: unknown[]) => (await db.prepare(sql).bind(...args).all<T>()).results;
export const exec = async (db: D1Like, sql: string, ...args: unknown[]) => (await db.prepare(sql).bind(...args).run()).meta.changes;
