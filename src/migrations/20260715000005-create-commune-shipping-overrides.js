'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const exists = await queryInterface.tableExists('commune_shipping_overrides');
    if (exists) return;

    await queryInterface.createTable('commune_shipping_overrides', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      delivery_company_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'delivery_companies', key: 'id' }, onDelete: 'CASCADE' },
      commune_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'communes', key: 'id' }, onDelete: 'CASCADE' },
      home_delivery_price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      desk_delivery_price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      home_delivery_available: { type: Sequelize.BOOLEAN, allowNull: true },
      desk_delivery_available: { type: Sequelize.BOOLEAN, allowNull: true },
      surcharge: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('commune_shipping_overrides', ['delivery_company_id', 'commune_id'], { unique: true, name: 'commune_overrides_company_commune' });
    await queryInterface.addIndex('commune_shipping_overrides', ['commune_id'], { name: 'commune_overrides_commune_id' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('commune_shipping_overrides');
  },
};
