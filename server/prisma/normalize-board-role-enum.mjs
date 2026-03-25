import pg from 'pg';

const { Client } = pg;

const desiredLabels = ['owner', 'admin', 'editor', 'viewer'];

function parseEnumRows(rows) {
  return rows.map((row) => row.enumlabel);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const tableResult = await client.query(`
      select to_regclass('public.board_roles') as board_roles
    `);

    if (!tableResult.rows[0]?.board_roles) {
      console.log('[normalize-board-role-enum] board_roles table is missing, skipping');
      return;
    }

    const typeResult = await client.query(`
      select udt_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'board_roles'
        and column_name = 'role'
    `);
    const currentTypeName = typeResult.rows[0]?.udt_name ?? '';

    const labelResult = await client.query(
      `
        select e.enumlabel
        from pg_type t
        join pg_enum e on e.enumtypid = t.oid
        where t.typname = $1
        order by e.enumsortorder
      `,
      [currentTypeName],
    );
    const labels = parseEnumRows(labelResult.rows);

    const defaultResult = await client.query(`
      select pg_get_expr(ad.adbin, ad.adrelid) as default_expr
      from pg_class c
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'role'
      left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
      where c.relname = 'board_roles'
    `);
    const defaultExpr = defaultResult.rows[0]?.default_expr ?? '';
    const defaultIsViewer = defaultExpr.includes("'viewer'");

    const labelsMatchDesired = labels.length === desiredLabels.length
      && labels.every((label, index) => label === desiredLabels[index]);

    if (currentTypeName === 'BoardRoleType' && labelsMatchDesired && defaultIsViewer) {
      console.log('[normalize-board-role-enum] enum already normalized');
      return;
    }

    if (labelsMatchDesired && currentTypeName !== 'BoardRoleType') {
      console.log(`[normalize-board-role-enum] renaming ${currentTypeName} to BoardRoleType`);
      await client.query('DROP TYPE IF EXISTS "BoardRoleType"');
      await client.query(`ALTER TYPE "${currentTypeName}" RENAME TO "BoardRoleType"`);
      if (!defaultIsViewer) {
        await client.query('ALTER TABLE "board_roles" ALTER COLUMN "role" SET DEFAULT \'viewer\'');
      }
      console.log('[normalize-board-role-enum] done');
      return;
    }

    if (labelsMatchDesired && currentTypeName === 'BoardRoleType') {
      if (!defaultIsViewer) {
        await client.query('ALTER TABLE "board_roles" ALTER COLUMN "role" SET DEFAULT \'viewer\'');
      }
      console.log('[normalize-board-role-enum] done');
      return;
    }

    if (!labelsMatchDesired) {
      console.log('[normalize-board-role-enum] rebuilding BoardRoleType');
      const normalizedTypeName = 'BoardRoleType_normalized';
      await client.query(`DROP TYPE IF EXISTS "${normalizedTypeName}"`);
      await client.query(
        `CREATE TYPE "${normalizedTypeName}" AS ENUM ('owner', 'admin', 'editor', 'viewer')`,
      );
      await client.query(`
        ALTER TABLE "board_roles"
          ALTER COLUMN "role" DROP DEFAULT,
          ALTER COLUMN "role" TYPE "${normalizedTypeName}"
          USING (
            CASE "role"::text
              WHEN 'member' THEN 'viewer'
              WHEN 'owner' THEN 'owner'
              WHEN 'admin' THEN 'admin'
              WHEN 'editor' THEN 'editor'
              WHEN 'viewer' THEN 'viewer'
              ELSE 'viewer'
            END
          )::"${normalizedTypeName}"
      `);
      await client.query(`ALTER TYPE "${currentTypeName}" RENAME TO "BoardRoleType_legacy"`);
      await client.query('DROP TYPE IF EXISTS "BoardRoleType"');
      await client.query(`ALTER TYPE "${normalizedTypeName}" RENAME TO "BoardRoleType"`);
      await client.query('DROP TYPE "BoardRoleType_legacy"');
      await client.query('ALTER TABLE "board_roles" ALTER COLUMN "role" SET DEFAULT \'viewer\'');
      console.log('[normalize-board-role-enum] done');
      return;
    }

    throw new Error(
      `Unsupported BoardRoleType state: currentTypeName=${currentTypeName}, labels=${labels.join(',')}, default=${defaultExpr}`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[normalize-board-role-enum] failed');
  console.error(error);
  process.exit(1);
});
