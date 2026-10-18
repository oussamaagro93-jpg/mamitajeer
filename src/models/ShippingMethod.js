module.exports = (sequelize, DataTypes) => {
  const ShippingMethod = sequelize.define(
    'ShippingMethod',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      zoneId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(200), allowNull: false },
      type: { type: DataTypes.ENUM('flat', 'free', 'weight_based', 'price_based'), allowNull: false },
      cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      minWeight: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      maxWeight: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      minPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      maxPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      estimatedDays: { type: DataTypes.STRING(50), allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { tableName: 'shipping_methods', indexes: [{ fields: ['zone_id'] }] },
  );

  ShippingMethod.associate = (models) => {
    ShippingMethod.belongsTo(models.ShippingZone, { foreignKey: 'zoneId', as: 'zone' });
  };

  return ShippingMethod;
};
