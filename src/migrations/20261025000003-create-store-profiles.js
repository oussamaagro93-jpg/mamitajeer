'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const exists = await queryInterface.tableExists('store_profiles');
    if (exists) return;

    await queryInterface.createTable('store_profiles', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      admin_id: { type: Sequelize.INTEGER, allowNull: false },
      name: { type: Sequelize.STRING(200), allowNull: true },
      logo: { type: Sequelize.STRING(500), allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      whatsapp: { type: Sequelize.STRING(30), allowNull: true },
      email: { type: Sequelize.STRING(255), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      facebook: { type: Sequelize.STRING(500), allowNull: true },
      instagram: { type: Sequelize.STRING(500), allowNull: true },
      x: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('store_profiles', ['admin_id'], {
      unique: true,
      name: 'store_profiles_admin_id_unique',
      where: { deleted_at: null },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('store_profiles');
  },
};
