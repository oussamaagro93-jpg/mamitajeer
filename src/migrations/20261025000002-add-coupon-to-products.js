'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('products');
    if (!columns.coupon_id) {
      await queryInterface.addColumn('products', 'coupon_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'coupons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    const indexes = await queryInterface.showIndex('products');
    const hasCouponIndex = indexes.some(function (index) {
      return index.name === 'products_coupon_id';
    });
    if (!hasCouponIndex) {
      await queryInterface.addIndex('products', ['coupon_id'], {
        name: 'products_coupon_id',
      });
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('products');
    if (columns.coupon_id) {
      try {
        await queryInterface.removeIndex('products', 'products_coupon_id');
      } catch (e) {
        // Index may not exist.
      }
      await queryInterface.removeColumn('products', 'coupon_id');
    }
  },
};
