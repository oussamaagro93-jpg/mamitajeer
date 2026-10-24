module.exports = (sequelize, DataTypes) => {
  const Coupon = sequelize.define(
    'Coupon',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      adminId: { type: DataTypes.INTEGER, allowNull: true },
      code: { type: DataTypes.STRING(50), allowNull: false },
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
    {
      tableName: 'coupons',
      indexes: [
        { unique: true, fields: ['admin_id', 'code'], where: { deleted_at: null } },
        { fields: ['is_active'] },
      ],
    },
  );

  Coupon.associate = (models) => {
    Coupon.belongsToMany(models.Product, {
      through: models.CouponProduct,
      foreignKey: 'couponId',
      otherKey: 'productId',
      as: 'products',
    });
    Coupon.belongsToMany(models.Category, {
      through: models.CouponCategory,
      foreignKey: 'couponId',
      otherKey: 'categoryId',
      as: 'categories',
    });
  };

  return Coupon;
};
