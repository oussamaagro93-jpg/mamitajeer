'use strict';

const TENANT_TABLES = [
  'products',
  'categories',
  'brands',
  'orders',
  'coupons',
  'inventory',
  'warehouses',
  'delivery_companies',
  'shipping_rates',
  'commune_shipping_overrides',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    // users: tenant membership + manager permission list
    if (tables.includes('users')) {
      const userColumns = await queryInterface.describeTable('users');

      if (!userColumns.admin_id) {
        await queryInterface.addColumn('users', 'admin_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
        await queryInterface.addIndex('users', ['admin_id'], { name: 'users_admin_id' });
      }

      if (!userColumns.permissions) {
        await queryInterface.addColumn('users', 'permissions', {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: [],
        });
      }
    }

    // Tenant-owned resources
    for (const table of TENANT_TABLES) {
      if (!tables.includes(table)) continue;
      const columns = await queryInterface.describeTable(table);
      if (!columns.admin_id) {
        await queryInterface.addColumn(table, 'admin_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
        await queryInterface.addIndex(table, ['admin_id'], {
          name: `${table}_admin_id`,
        });
      }
    }

    // Backfill: associate existing data with the first admin account so the
    // single-store data becomes the first tenant. Superadmins keep admin_id NULL.
    const primaryAdmin = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL ORDER BY id ASC LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    if (primaryAdmin.length > 0) {
      const adminId = primaryAdmin[0].id;
      await queryInterface.sequelize.query(
        "UPDATE users SET admin_id = :adminId WHERE admin_id IS NULL AND role IN ('manager','employee','customer')",
        { replacements: { adminId } },
      );
      await queryInterface.sequelize.query(
        "UPDATE users SET admin_id = NULL WHERE role IN ('super_admin','admin')",
      );

      for (const table of TENANT_TABLES) {
        if (!tables.includes(table)) continue;
        await queryInterface.sequelize.query(
          `UPDATE "${table}" SET admin_id = :adminId WHERE admin_id IS NULL`,
          { replacements: { adminId } },
        );
      }
    }

    await queryInterface.sequelize.query(
      "UPDATE users SET permissions = '[]'::jsonb WHERE permissions IS NULL",
    );
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();

    for (const table of TENANT_TABLES) {
      if (!tables.includes(table)) continue;
      const columns = await queryInterface.describeTable(table);
      if (columns.admin_id) {
        try {
          await queryInterface.removeIndex(table, `${table}_admin_id`);
        } catch (e) {
          // index may not exist
        }
        await queryInterface.removeColumn(table, 'admin_id');
      }
    }

    if (tables.includes('users')) {
      const columns = await queryInterface.describeTable('users');
      if (columns.admin_id) {
        try {
          await queryInterface.removeIndex('users', 'users_admin_id');
        } catch (e) {
          // index may not exist
        }
        await queryInterface.removeColumn('users', 'admin_id');
      }
      if (columns.permissions) {
        await queryInterface.removeColumn('users', 'permissions');
      }
    }
  },
};
