'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('related_products')) {
      return;
    }

    await queryInterface.createTable('related_products', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      related_product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('related_products', ['product_id'], { name: 'related_products_product_id' });
    await queryInterface.addIndex('related_products', ['related_product_id'], { name: 'related_products_related_product_id' });
    await queryInterface.addConstraint('related_products', {
      fields: ['product_id', 'related_product_id'],
      type: 'unique',
      name: 'unique_product_relation',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('related_products');
  },
};
