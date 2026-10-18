'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const exists = await queryInterface.tableExists('communes');
    if (exists) return;

    await queryInterface.createTable('communes', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      wilaya_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'wilayas', key: 'id' }, onDelete: 'CASCADE' },
      code: { type: Sequelize.STRING(20), allowNull: true },
      name_ar: { type: Sequelize.STRING(200), allowNull: false },
      name_fr: { type: Sequelize.STRING(200), allowNull: false },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('communes', ['wilaya_id'], { name: 'communes_wilaya_id' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('communes');
  },
};
