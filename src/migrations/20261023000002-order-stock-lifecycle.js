'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const orderColumns = await queryInterface.describeTable('orders');
    if (!orderColumns.stock_restored) {
      await queryInterface.addColumn('orders', 'stock_restored', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    const itemColumns = await queryInterface.describeTable('order_items');
    if (!itemColumns.inventory_allocations) {
      await queryInterface.addColumn('order_items', 'inventory_allocations', {
        type: Sequelize.JSONB,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const orderColumns = await queryInterface.describeTable('orders');
    if (orderColumns.stock_restored) {
      await queryInterface.removeColumn('orders', 'stock_restored');
    }

    const itemColumns = await queryInterface.describeTable('order_items');
    if (itemColumns.inventory_allocations) {
      await queryInterface.removeColumn('order_items', 'inventory_allocations');
    }
  },
};
