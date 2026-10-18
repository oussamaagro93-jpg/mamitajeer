'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const exists = await queryInterface.tableExists('shipping_rates');
    if (exists) return;

    await queryInterface.createTable('shipping_rates', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      delivery_company_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'delivery_companies', key: 'id' }, onDelete: 'CASCADE' },
      wilaya_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'wilayas', key: 'id' }, onDelete: 'CASCADE' },
      home_delivery_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      desk_delivery_price: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      home_delivery_available: { type: Sequelize.BOOLEAN, defaultValue: true },
      desk_delivery_available: { type: Sequelize.BOOLEAN, defaultValue: true },
      estimated_delivery_days_min: { type: Sequelize.INTEGER, allowNull: true },
      estimated_delivery_days_max: { type: Sequelize.INTEGER, allowNull: true },
      effective_from: { type: Sequelize.DATEONLY, allowNull: true },
      active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('shipping_rates', ['delivery_company_id', 'wilaya_id'], { name: 'shipping_rates_company_wilaya' });
    await queryInterface.addIndex('shipping_rates', ['delivery_company_id'], { name: 'shipping_rates_company_id' });
    await queryInterface.addIndex('shipping_rates', ['wilaya_id'], { name: 'shipping_rates_wilaya_id' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('shipping_rates');
  },
};
