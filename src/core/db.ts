import type { Database, SqlValue } from "sql.js";

export type BindValue = SqlValue;

export class Db {
  constructor(public sql: Database) {}

  exec(sql: string): void {
    this.sql.run(sql);
  }

  run(sql: string, params: BindValue[] = []): void {
    this.sql.run(sql, params);
  }

  all<T>(sql: string, params: BindValue[] = []): T[] {
    const stmt = this.sql.prepare(sql);
    try {
      if (params.length) stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  get<T>(sql: string, params: BindValue[] = []): T | undefined {
    return this.all<T>(sql, params)[0];
  }

  transaction<T>(fn: () => T): T {
    this.exec("BEGIN");
    try {
      const result = fn();
      this.exec("COMMIT");
      return result;
    } catch (err) {
      this.exec("ROLLBACK");
      throw err;
    }
  }

  export(): Uint8Array {
    return this.sql.export();
  }
}
