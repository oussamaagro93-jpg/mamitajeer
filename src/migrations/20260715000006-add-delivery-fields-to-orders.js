'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('orders')) {
      return;
    }

    const tableInfo = await queryInterface.describeTable('orders');

    const additions = [];

    if (!tableInfo.delivery_company_id) {
      additions.push(
        queryInterface.addColumn('orders', 'delivery_company_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        })
      );
    }

    if (!tableInfo.delivery_company_name) {
      additions.push(
        queryInterface.addColumn('orders', 'delivery_company_name', {
          type: Sequelize.STRING(200),
          allowNull: true,
        })
      );
    }

    if (!tableInfo.delivery_type) {
      additions.push(
        queryInterface.addColumn('orders', 'delivery_type', {
          type: Sequelize.ENUM('home_delivery', 'desk_delivery'),
          allowNull: true,
        })
      );
    }

    if (!tableInfo.wilaya_id) {
      additions.push(
        queryInterface.addColumn('orders', 'wilaya_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        })
      );
    }

    if (!tableInfo.wilaya_name) {
      additions.push(
        queryInterface.addColumn('orders', 'wilaya_name', {
          type: Sequelize.STRING(200),
          allowNull: true,
        })
      );
    }

    if (!tableInfo.commune_id) {
      additions.push(
        queryInterface.addColumn('orders', 'commune_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
        })
      );
    }

    if (!tableInfo.commune_name) {
      additions.push(
        queryInterface.addColumn('orders', 'commune_name', {
          type: Sequelize.STRING(200),
          allowNull: true,
        })
      );
    }

    if (!tableInfo.delivery_address) {
      additions.push(
        queryInterface.addColumn('orders', 'delivery_address', {
          type: Sequelize.TEXT,
          allowNull: true,
        })
      );
    }

    await Promise.all(additions);

    if (tableInfo.shipping_method) {
      await queryInterface.changeColumn('orders', 'shipping_method', {
        type: Sequelize.STRING(200),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const columns = [
      'delivery_company_id', 'delivery_company_name', 'delivery_type',
      'wilaya_id', 'wilaya_name', 'commune_id', 'commune_name', 'delivery_address',
    ];

    for (const col of columns) {
      try {
        await queryInterface.removeColumn('orders', col);
      } catch (e) {
        // column may not exist
      }
    }

    try {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_orders_delivery_type');
    } catch (e) {
      // type may not exist
    }
  },
};
