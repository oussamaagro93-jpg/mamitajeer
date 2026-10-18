module.exports = (sequelize, DataTypes) => {
  const CouponCategory = sequelize.define(
    'CouponCategory',
    {
      couponId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
      categoryId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    },
    { tableName: 'coupon_categories', timestamps: false },
  );

  return CouponCategory;
};
