'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('product_images')) {
      return;
    }

    const tableInfo = await queryInterface.describeTable('product_images');
    if (!tableInfo.public_id) {
      await queryInterface.addColumn('product_images', 'public_id', {
        type: Sequelize.STRING(300),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('product_images', 'public_id');
  },
};
