/**
 * SQL builders for making Row Level Security effective. RLS policies are bypassed by superusers, roles
 * with BYPASSRLS and (unless FORCEd) the table owner, so an application that connects as one of those
 * gets no database-level tenant isolation. Run the application as a dedicated role built with these
 * statements, and keep migrations/seeding on the owner role. Pure functions: they return SQL text and
 * never execute it, and they contain no secrets (set the role's password separately).
 */

const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;

/** Postgres setting read by the tenant-isolation policies (`current_setting('app.tenant_id', true)`). */
export const TENANT_SETTING = 'app.tenant_id';

export function assertSafeIdentifier(value: string, what: string): string {
  if (!IDENTIFIER.test(value)) {
    throw new Error(`Unsafe ${what}: expected lowercase letters, digits and underscores (max 63), got "${value}"`);
  }
  return value;
}

const quote = (identifier: string): string => `"${identifier}"`;

export interface AppRoleOptions {
  /** Role the application connects as, e.g. `maw_app`. */
  readonly role: string;
  /** Tables the application reads and writes. */
  readonly tables: readonly string[];
  /** Schema holding the tables (default `public`). */
  readonly schema?: string;
}

/**
 * Creates (if missing) a login role that cannot bypass RLS and grants it data access to the tables only.
 * Does not set a password: run `ALTER ROLE ... PASSWORD` from your secret store.
 */
export function appRoleStatements(options: AppRoleOptions): readonly string[] {
  const role = assertSafeIdentifier(options.role, 'role name');
  const schema = assertSafeIdentifier(options.schema ?? 'public', 'schema name');
  const tables = options.tables.map((t) => `${quote(schema)}.${quote(assertSafeIdentifier(t, 'table name'))}`);
  return [
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN `
      + `CREATE ROLE ${quote(role)} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE; END IF; END $$`,
    `GRANT USAGE ON SCHEMA ${quote(schema)} TO ${quote(role)}`,
    ...(tables.length === 0 ? [] : [`GRANT SELECT, INSERT, UPDATE, DELETE ON ${tables.join(', ')} TO ${quote(role)}`]),
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${quote(schema)} TO ${quote(role)}`,
  ];
}

/** Makes the policies apply to the table owner too (`FORCE ROW LEVEL SECURITY`), after enabling RLS. */
export function forceRlsStatements(tables: readonly string[], schema = 'public'): readonly string[] {
  const s = assertSafeIdentifier(schema, 'schema name');
  return tables.flatMap((table) => {
    const name = `${quote(s)}.${quote(assertSafeIdentifier(table, 'table name'))}`;
    return [`ALTER TABLE ${name} ENABLE ROW LEVEL SECURITY`, `ALTER TABLE ${name} FORCE ROW LEVEL SECURITY`];
  });
}
