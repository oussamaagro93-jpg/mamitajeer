'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('store_profiles')) return;

    const tableInfo = await queryInterface.describeTable('store_profiles');
    if (!tableInfo.phone2) {
      await queryInterface.addColumn('store_profiles', 'phone2', {
        type: Sequelize.STRING(30),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('store_profiles')) return;

    const tableInfo = await queryInterface.describeTable('store_profiles');
    if (tableInfo.phone2) {
      await queryInterface.removeColumn('store_profiles', 'phone2');
    }
  },
};
