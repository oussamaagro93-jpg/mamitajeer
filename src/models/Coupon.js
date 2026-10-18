module.exports = (sequelize, DataTypes) => {
  const Coupon = sequelize.define(
    'Coupon',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      type: { type: DataTypes.ENUM('percentage', 'fixed', 'free_shipping'), allowNull: false },
      value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      minOrderAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      maxDiscountAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      usageLimit: { type: DataTypes.INTEGER, allowNull: true },
      usedCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      perUserLimit: { type: DataTypes.INTEGER, defaultValue: 1 },
      startDate: { type: DataTypes.DATE, allowNull: true },
      endDate: { type: DataTypes.DATE, allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      description: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'coupons', indexes: [{ unique: true, fields: ['code'] }, { fields: ['is_active'] }] },
  );

  Coupon.associate = (models) => {
    Coupon.belongsToMany(models.Product, { through: 'CouponProducts', foreignKey: 'couponId', as: 'products' });
    Coupon.belongsToMany(models.Category, { through: 'CouponCategories', foreignKey: 'couponId', as: 'categories' });
  };

  return Coupon;
};
