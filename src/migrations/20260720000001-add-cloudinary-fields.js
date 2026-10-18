'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('products')) {
      return;
    }

    const tableInfo = await queryInterface.describeTable('products');

    if (!tableInfo.image) {
      await queryInterface.addColumn('products', 'image', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    }

    if (!tableInfo.image_public_id) {
      await queryInterface.addColumn('products', 'image_public_id', {
        type: Sequelize.STRING(300),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('products', 'image');
    await queryInterface.removeColumn('products', 'image_public_id');
  },
};
