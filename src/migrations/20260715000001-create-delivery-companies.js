'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const exists = await queryInterface.tableExists('delivery_companies');
    if (exists) return;

    await queryInterface.createTable('delivery_companies', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      logo: { type: Sequelize.STRING(500), allowNull: true },
      phone: { type: Sequelize.STRING(20), allowNull: true },
      website: { type: Sequelize.STRING(500), allowNull: true },
      contact_person: { type: Sequelize.STRING(200), allowNull: true },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('delivery_companies', ['code'], { unique: true, name: 'delivery_companies_code_unique' });
    await queryInterface.addIndex('delivery_companies', ['active'], { name: 'delivery_companies_active' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('delivery_companies');
  },
};
