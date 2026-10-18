module.exports = (sequelize, DataTypes) => {
  const ShippingZone = sequelize.define(
    'ShippingZone',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      countries: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
      states: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
      zipCodes: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { tableName: 'shipping_zones' },
  );

  ShippingZone.associate = (models) => {
    ShippingZone.hasMany(models.ShippingMethod, { foreignKey: 'zoneId', as: 'methods' });
  };

  return ShippingZone;
};
