'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const exists = await queryInterface.tableExists('wilayas');
    if (exists) return;

    await queryInterface.createTable('wilayas', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
      name_ar: { type: Sequelize.STRING(200), allowNull: false },
      name_fr: { type: Sequelize.STRING(200), allowNull: false },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('wilayas', ['code'], { unique: true, name: 'wilayas_code_unique' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('wilayas');
  },
};
