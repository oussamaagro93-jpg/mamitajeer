'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('orders')) {
      return;
    }

    await queryInterface.changeColumn('orders', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.changeColumn('orders', 'email', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    const tableInfo = await queryInterface.describeTable('orders');
    if (!tableInfo.guest_name) {
      await queryInterface.addColumn('orders', 'guest_name', {
        type: Sequelize.STRING(200),
        allowNull: true,
      });
    }
    if (!tableInfo.guest_phone) {
      await queryInterface.addColumn('orders', 'guest_phone', {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
    }
    if (!tableInfo.guest_wilaya) {
      await queryInterface.addColumn('orders', 'guest_wilaya', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }
    if (!tableInfo.guest_city) {
      await queryInterface.addColumn('orders', 'guest_city', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }
    if (!tableInfo.guest_address) {
      await queryInterface.addColumn('orders', 'guest_address', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.changeColumn('orders', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.changeColumn('orders', 'email', {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
    await queryInterface.removeColumn('orders', 'guest_name');
    await queryInterface.removeColumn('orders', 'guest_phone');
    await queryInterface.removeColumn('orders', 'guest_wilaya');
    await queryInterface.removeColumn('orders', 'guest_city');
    await queryInterface.removeColumn('orders', 'guest_address');
  },
};
