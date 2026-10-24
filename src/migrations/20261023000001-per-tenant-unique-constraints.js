'use strict';

// Identifiers that are safe to reuse across tenants. Product/category/brand
// slugs used by the public storefront stay globally unique; everything else
// becomes unique per admin.
const TARGETS = [
  { table: 'categories', column: 'slug' },
  { table: 'brands', column: 'name' },
  { table: 'brands', column: 'slug' },
  { table: 'products', column: 'sku' },
  { table: 'products', column: 'barcode' },
  { table: 'coupons', column: 'code' },
  { table: 'delivery_companies', column: 'code' },
  { table: 'warehouses', column: 'code' },
];

function quote(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    for (const target of TARGETS) {
      const constraints = await sequelize.query(
        `SELECT tc.constraint_name, tc.table_name,
                array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS columns
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
         WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
           AND tc.table_name = :table
         GROUP BY tc.constraint_name, tc.table_name`,
        { replacements: { table: target.table }, type: sequelize.QueryTypes.SELECT },
      );

      for (const constraint of constraints) {
        const columns = Array.isArray(constraint.columns)
          ? constraint.columns
          : String(constraint.columns || '').replace(/[{}]/g, '').split(',');
        if (columns.length === 1 && columns[0] === target.column) {
          await sequelize.query(
            `ALTER TABLE ${quote(target.table)} DROP CONSTRAINT ${quote(constraint.constraint_name)}`,
          );
        }
      }

      const indexes = await sequelize.query(
        `SELECT indexname, indexdef FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = :table`,
        { replacements: { table: target.table }, type: sequelize.QueryTypes.SELECT },
      );

      for (const index of indexes) {
        if (index.indexname === target.table + '_pkey') continue;
        const uniqueSingleColumn = new RegExp(
          '^CREATE UNIQUE INDEX .* USING btree \\("?' + target.column + '"?\\)$',
          'i',
        );
        if (uniqueSingleColumn.test(index.indexdef)) {
          await sequelize.query('DROP INDEX IF EXISTS ' + quote(index.indexname));
        }
      }

      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS ${quote(target.table + '_admin_id_' + target.column + '_uniq')}
         ON ${quote(target.table)} (${quote('admin_id')}, ${quote(target.column)})
         WHERE ${quote('deleted_at')} IS NULL`,
      );
    }
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;

    for (const target of TARGETS) {
      await sequelize.query(
        'DROP INDEX IF EXISTS ' + quote(target.table + '_admin_id_' + target.column + '_uniq'),
      );

      const constraintName = target.table + '_' + target.column + '_key';
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${constraintName}') THEN
            ALTER TABLE ${quote(target.table)}
              ADD CONSTRAINT ${quote(constraintName)} UNIQUE (${quote(target.column)});
          END IF;
        END $$;
      `);
    }
  },
};
