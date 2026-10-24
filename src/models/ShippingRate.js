module.exports = (sequelize, DataTypes) => {
  const ShippingRate = sequelize.define(
    'ShippingRate',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      adminId: { type: DataTypes.INTEGER, allowNull: true },
      deliveryCompanyId: { type: DataTypes.INTEGER, allowNull: false },
      wilayaId: { type: DataTypes.INTEGER, allowNull: false },
      homeDeliveryPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      deskDeliveryPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      homeDeliveryAvailable: { type: DataTypes.BOOLEAN, defaultValue: true },
      deskDeliveryAvailable: { type: DataTypes.BOOLEAN, defaultValue: true },
      estimatedDeliveryDaysMin: { type: DataTypes.INTEGER, allowNull: true },
      estimatedDeliveryDaysMax: { type: DataTypes.INTEGER, allowNull: true },
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: true },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      tableName: 'shipping_rates',
      indexes: [
        { fields: ['delivery_company_id', 'wilaya_id'] },
        { fields: ['delivery_company_id'] },
        { fields: ['wilaya_id'] },
      ],
    },
  );

  ShippingRate.associate = (models) => {
    ShippingRate.belongsTo(models.DeliveryCompany, { foreignKey: 'deliveryCompanyId', as: 'deliveryCompany' });
    ShippingRate.belongsTo(models.Wilaya, { foreignKey: 'wilayaId', as: 'wilaya' });
  };

  return ShippingRate;
};
