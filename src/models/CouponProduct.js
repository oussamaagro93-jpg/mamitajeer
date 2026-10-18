module.exports = (sequelize, DataTypes) => {
  const CouponProduct = sequelize.define(
    'CouponProduct',
    {
      couponId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
      productId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    },
    { tableName: 'coupon_products', timestamps: false },
  );

  return CouponProduct;
};
