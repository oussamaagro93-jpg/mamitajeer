'use strict';

const qi = (name) => '"' + String(name).replace(/"/g, '""') + '"';

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const run = (sql, options) => sequelize.query(sql, options);
    const ORPHAN_TABLES = ['coupon_products', 'coupon_categories'];

    const transaction = await sequelize.transaction();
    try {
      const t = { transaction };

      const fkResult = await run(
        `SELECT
           tc.constraint_name,
           tc.table_name AS child_table,
           kcu.column_name AS child_column,
           ccu.table_name AS parent_table,
           ccu.column_name AS parent_column,
           rc.delete_rule,
           rc.update_rule,
           c.is_nullable
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
         JOIN information_schema.referential_constraints rc
           ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
         JOIN information_schema.columns c
           ON c.table_schema = tc.table_schema AND c.table_name = tc.table_name AND c.column_name = kcu.column_name
         WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`,
        t,
      );
      const fkList = fkResult[0].map((r) => ({
        name: r.constraint_name,
        child: r.child_table,
        col: r.child_column,
        parent: r.parent_table,
        parentCol: r.parent_column,
        deleteRule: r.delete_rule,
        updateRule: r.update_rule,
        nullable: r.is_nullable === 'YES',
      }));

      const uuidColResult = await run(
        `SELECT table_name, column_name, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public' AND data_type = 'uuid'`,
        t,
      );
      const uuidCols = uuidColResult[0];

      const fkKeySet = new Set(fkList.map((f) => `${f.child}.${f.col}`));
      const fkByColumn = new Map(fkList.map((f) => [`${f.child}.${f.col}`, f]));

      const pkTables = [];
      const fkCols = [];
      const nonFkUuidCols = [];
      for (const c of uuidCols) {
        if (ORPHAN_TABLES.includes(c.table_name)) continue;
        if (c.column_name === 'id') {
          pkTables.push({ table: c.table_name });
        } else if (fkKeySet.has(`${c.table_name}.${c.column_name}`)) {
          const fk = fkByColumn.get(`${c.table_name}.${c.column_name}`);
          fkCols.push({
            table: c.table_name,
            col: c.column_name,
            nullable: c.is_nullable === 'YES',
            parent: fk.parent,
            parentCol: fk.parentCol,
          });
        } else {
          nonFkUuidCols.push({ table: c.table_name, col: c.column_name, nullable: c.is_nullable === 'YES' });
        }
      }

      const liveFkList = fkList.filter((f) => !ORPHAN_TABLES.includes(f.child));

      const indexResult = await run(
        `SELECT t.relname AS tablename,
                i.relname AS indexname,
                ix.indisunique,
                con.conname AS constraint_name,
                con.contype AS constraint_type,
                array_to_string(array_agg(a.attname ORDER BY k.ord), ',') AS cols
         FROM pg_class t
         JOIN pg_index ix ON t.oid = ix.indrelid
         JOIN pg_class i ON i.oid = ix.indexrelid
         LEFT JOIN pg_constraint con ON con.conindid = ix.indexrelid
         JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
         JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
         WHERE t.relkind = 'r' AND t.relnamespace = 'public'::regnamespace
         GROUP BY t.relname, i.relname, ix.indisunique, con.conname, con.contype, ix.indexrelid
         ORDER BY t.relname, i.relname`,
        t,
      );
      const indexMap = new Map();
      const typePriority = (type) => (type === 'p' ? 3 : type === 'u' ? 2 : type === null ? 1 : 0);
      for (const r of indexResult[0]) {
        const key = `${r.tablename}.${r.indexname}`;
        const entry = {
          table: r.tablename,
          name: r.indexname,
          unique: r.indisunique,
          constraintName: r.constraint_name || null,
          constraintType: r.constraint_type || null,
          cols: String(r.cols).split(',').filter(Boolean),
        };
        const existing = indexMap.get(key);
        if (!existing || typePriority(entry.constraintType) > typePriority(existing.constraintType)) {
          indexMap.set(key, entry);
        }
      }
      const allIndexes = Array.from(indexMap.values());

      const convertedColumnKeySet = new Set();
      for (const p of pkTables) convertedColumnKeySet.add(`${p.table}.id`);
      for (const f of fkCols) convertedColumnKeySet.add(`${f.table}.${f.col}`);

      const toRecreate = allIndexes.filter((ix) =>
        !ORPHAN_TABLES.includes(ix.table) &&
        ix.cols.some((c) => convertedColumnKeySet.has(`${ix.table}.${c}`)),
      );
      const pkTableSet = new Set(pkTables.map((p) => p.table));

      console.log('UUID->INTEGER migration: dropping orphan tables', ORPHAN_TABLES.join(', '));
      for (const table of ORPHAN_TABLES) {
        await run(`DROP TABLE IF EXISTS ${qi(table)} CASCADE`, t);
      }

      console.log('Dropping all foreign key constraints...');
      for (const f of liveFkList) {
        await run(`ALTER TABLE ${qi(f.child)} DROP CONSTRAINT ${qi(f.name)}`, t);
      }

      console.log(`Adding and populating integer id columns for ${pkTables.length} tables...`);
      for (const p of pkTables) {
        await run(`ALTER TABLE ${qi(p.table)} ADD COLUMN __new_id INTEGER`, t);
        await run(
          `UPDATE ${qi(p.table)} SET __new_id = x.rn FROM (
             SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn FROM ${qi(p.table)}
           ) x WHERE ${qi(p.table)}.id = x.id`,
          t,
        );
        await run(`ALTER TABLE ${qi(p.table)} ALTER COLUMN __new_id SET NOT NULL`, t);
      }

      console.log(`Remapping ${fkCols.length} foreign key columns...`);
      for (const f of fkCols) {
        const tempCol = `__${f.col}_new`;
        await run(`ALTER TABLE ${qi(f.table)} ADD COLUMN ${qi(tempCol)} INTEGER`, t);
        await run(
          `UPDATE ${qi(f.table)} SET ${qi(tempCol)} = p.__new_id FROM ${qi(f.parent)} p
           WHERE ${qi(f.table)}.${qi(f.col)} = p.id AND ${qi(f.table)}.${qi(f.col)} IS NOT NULL`,
          t,
        );
      }

      console.log(`Converting ${nonFkUuidCols.length} unconstrained uuid columns to integer...`);
      for (const c of nonFkUuidCols) {
        const check = await run(
          `SELECT COUNT(*) AS n FROM ${qi(c.table)} WHERE ${qi(c.col)} IS NOT NULL`,
          t,
        );
        const nonNull = parseInt(check[0][0].n, 10);
        if (nonNull > 0) {
          throw new Error(
            `Cannot auto-convert ${c.table}.${c.col}: contains ${nonNull} non-null uuid values with no FK. Handle manually.`,
          );
        }
        await run(`ALTER TABLE ${qi(c.table)} ALTER COLUMN ${qi(c.col)} TYPE INTEGER USING NULL::integer`, t);
      }

      console.log('Swapping primary keys to integer and creating sequences...');
      for (const p of pkTables) {
        await run(`ALTER TABLE ${qi(p.table)} DROP COLUMN id`, t);
        await run(`ALTER TABLE ${qi(p.table)} RENAME COLUMN __new_id TO id`, t);
        await run(`ALTER TABLE ${qi(p.table)} ADD CONSTRAINT ${qi(p.table + '_pkey')} PRIMARY KEY (id)`, t);
        const seqName = `${p.table}_id_seq`;
        await run(`CREATE SEQUENCE IF NOT EXISTS ${qi(seqName)}`, t);
        await run(`ALTER TABLE ${qi(p.table)} ALTER COLUMN id SET DEFAULT nextval('${seqName}')`, t);
        await run(
          `SELECT setval('${seqName}', COALESCE((SELECT MAX(id) FROM ${qi(p.table)}), 0) + 1, false)`,
          t,
        );
        await run(`ALTER SEQUENCE ${qi(seqName)} OWNED BY ${qi(p.table)}.id`, t);
      }

      console.log('Swapping foreign key columns and restoring constraints...');
      for (const f of liveFkList) {
        const tempCol = `__${f.col}_new`;
        await run(`ALTER TABLE ${qi(f.child)} DROP COLUMN ${qi(f.col)}`, t);
        await run(`ALTER TABLE ${qi(f.child)} RENAME COLUMN ${qi(tempCol)} TO ${qi(f.col)}`, t);
        if (!f.nullable) {
          await run(`ALTER TABLE ${qi(f.child)} ALTER COLUMN ${qi(f.col)} SET NOT NULL`, t);
        }
        await run(
          `ALTER TABLE ${qi(f.child)} ADD CONSTRAINT ${qi(f.name)} FOREIGN KEY (${qi(f.col)})
           REFERENCES ${qi(f.parent)} (${qi(f.parentCol)}) ON DELETE ${f.deleteRule} ON UPDATE ${f.updateRule}`,
          t,
        );
      }

      console.log('Restoring dropped constraints and indexes...');
      for (const ix of toRecreate) {
        if (ix.constraintType === 'p' && pkTableSet.has(ix.table)) continue;
        if (ix.constraintType === 'p') {
          await run(
            `ALTER TABLE ${qi(ix.table)} ADD CONSTRAINT ${qi(ix.name)} PRIMARY KEY (${ix.cols.map(qi).join(', ')})`,
            t,
          );
        } else if (ix.constraintType === 'u') {
          await run(
            `ALTER TABLE ${qi(ix.table)} ADD CONSTRAINT ${qi(ix.name)} UNIQUE (${ix.cols.map(qi).join(', ')})`,
            t,
          );
        } else {
          const unique = ix.unique ? 'UNIQUE ' : '';
          await run(
            `CREATE ${unique}INDEX ${qi(ix.name)} ON ${qi(ix.table)} (${ix.cols.map(qi).join(', ')})`,
            t,
          );
        }
      }

      console.log('Ensuring delivery FK constraints on orders...');
      const orderColResult = await run(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'orders'
           AND column_name IN ('delivery_company_id', 'wilaya_id', 'commune_id')`,
        t,
      );
      const existingOrderFkResult = await run(
        `SELECT kcu.column_name FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
         WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
           AND tc.table_name = 'orders'
           AND kcu.column_name IN ('delivery_company_id', 'wilaya_id', 'commune_id')`,
        t,
      );
      const orderColSet = new Set(orderColResult[0].map((r) => r.column_name));
      const existingOrderFkCols = new Set(existingOrderFkResult[0].map((r) => r.column_name));
      const deliveryFkDefs = [
        { col: 'delivery_company_id', ref: 'delivery_companies', rule: 'SET NULL' },
        { col: 'wilaya_id', ref: 'wilayas', rule: 'SET NULL' },
        { col: 'commune_id', ref: 'communes', rule: 'SET NULL' },
      ];
      for (const def of deliveryFkDefs) {
        if (!orderColSet.has(def.col)) continue;
        if (existingOrderFkCols.has(def.col)) continue;
        await run(
          `ALTER TABLE orders ADD CONSTRAINT ${qi(`orders_${def.col}_fkey`)}
           FOREIGN KEY (${qi(def.col)}) REFERENCES ${qi(def.ref)} (id)
           ON DELETE ${def.rule} ON UPDATE CASCADE`,
          t,
        );
      }

      console.log('Ensuring FK constraints for related_products...');
      const relatedTableResult = await run(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'related_products'`,
        t,
      );
      if (relatedTableResult[0].length > 0) {
        const relatedFkResult = await run(
          `SELECT kcu.column_name FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
           WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
             AND tc.table_name = 'related_products'`,
          t,
        );
        const existingRelatedFkCols = new Set(relatedFkResult[0].map((r) => r.column_name));
        for (const col of ['product_id', 'related_product_id']) {
          if (existingRelatedFkCols.has(col)) continue;
          await run(
            `ALTER TABLE related_products ADD CONSTRAINT ${qi(`related_products_${col}_fkey`)}
             FOREIGN KEY (${qi(col)}) REFERENCES products (id)
             ON DELETE CASCADE ON UPDATE CASCADE`,
            t,
          );
        }
      }

      await transaction.commit();
      console.log('UUID->INTEGER migration completed successfully.');
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down() {
    throw new Error(
      'Converting back to UUID is not supported because the original uuid values were discarded. Restore from a pre-migration backup instead.',
    );
  },
};
