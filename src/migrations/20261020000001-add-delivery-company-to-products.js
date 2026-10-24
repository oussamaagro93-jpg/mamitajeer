'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('products')) return;

    const tableInfo = await queryInterface.describeTable('products');
    if (!tableInfo.delivery_company_id) {
      await queryInterface.addColumn('products', 'delivery_company_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'delivery_companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });

      await queryInterface.addIndex('products', ['delivery_company_id'], {
        name: 'products_delivery_company_id',
      });
    }
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('products')) return;

    const tableInfo = await queryInterface.describeTable('products');
    if (tableInfo.delivery_company_id) {
      try {
        await queryInterface.removeIndex('products', 'products_delivery_company_id');
      } catch (e) {
        // index may not exist
      }
      await queryInterface.removeColumn('products', 'delivery_company_id');
    }
  },
};
