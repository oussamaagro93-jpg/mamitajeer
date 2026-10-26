'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('orders', 'currency', {
      type: Sequelize.STRING(3),
      allowNull: true,
      defaultValue: 'DZD',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('orders', 'currency', {
      type: Sequelize.STRING(3),
      allowNull: true,
      defaultValue: 'USD',
    });
  },
};
