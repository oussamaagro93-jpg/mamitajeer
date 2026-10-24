'use strict';

// Completes the coupon-to-order flow: coupon restrictions (products and
// categories) plus the coupon reference stored on each order.
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const qi = (name) => '"' + String(name).replace(/"/g, '""') + '"';

    // Restriction join tables were dropped during the UUID -> INTEGER
    // migration. Recreate them idempotently.
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ${qi('coupon_products')} (
        ${qi('coupon_id')} INTEGER NOT NULL,
        ${qi('product_id')} INTEGER NOT NULL,
        PRIMARY KEY (${qi('coupon_id')}, ${qi('product_id')})
      )
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ${qi('coupon_categories')} (
        ${qi('coupon_id')} INTEGER NOT NULL,
        ${qi('category_id')} INTEGER NOT NULL,
        PRIMARY KEY (${qi('coupon_id')}, ${qi('category_id')})
      )
    `);

    const addForeignKey = async (table, constraint, column, parent) => {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = '${constraint}'
          ) THEN
            ALTER TABLE ${qi(table)}
              ADD CONSTRAINT ${qi(constraint)}
              FOREIGN KEY (${qi(column)}) REFERENCES ${qi(parent)} (${qi('id')})
              ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `);
    };

    await addForeignKey('coupon_products', 'coupon_products_coupon_id_fkey', 'coupon_id', 'coupons');
    await addForeignKey('coupon_products', 'coupon_products_product_id_fkey', 'product_id', 'products');
    await addForeignKey('coupon_categories', 'coupon_categories_coupon_id_fkey', 'coupon_id', 'coupons');
    await addForeignKey('coupon_categories', 'coupon_categories_category_id_fkey', 'category_id', 'categories');

    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS "coupon_products_product_id" ON "coupon_products" ("product_id")',
    );
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS "coupon_categories_category_id" ON "coupon_categories" ("category_id")',
    );

    // Orders store the coupon used so usage limits can be enforced per
    // customer even if the coupon code is edited later.
    const orderColumns = await queryInterface.describeTable('orders');
    if (!orderColumns.coupon_id) {
      await queryInterface.addColumn('orders', 'coupon_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'coupons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
      await queryInterface.addIndex('orders', ['coupon_id'], { name: 'orders_coupon_id' });
    }

    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS "orders_coupon_user_id" ON "orders" ("coupon_id", "user_id")',
    );
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS "orders_coupon_guest_phone" ON "orders" ("coupon_id", "guest_phone")',
    );
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const qi = (name) => '"' + String(name).replace(/"/g, '""') + '"';

    await sequelize.query('DROP INDEX IF EXISTS "orders_coupon_user_id"');
    await sequelize.query('DROP INDEX IF EXISTS "orders_coupon_guest_phone"');

    const orderColumns = await queryInterface.describeTable('orders');
    if (orderColumns.coupon_id) {
      try {
        await queryInterface.removeIndex('orders', 'orders_coupon_id');
      } catch (e) {
        // index may not exist
      }
      await queryInterface.removeColumn('orders', 'coupon_id');
    }

    await sequelize.query(`DROP TABLE IF EXISTS ${qi('coupon_products')} CASCADE`);
    await sequelize.query(`DROP TABLE IF EXISTS ${qi('coupon_categories')} CASCADE`);
  },
};
