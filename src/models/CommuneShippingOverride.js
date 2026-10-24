module.exports = (sequelize, DataTypes) => {
  const CommuneShippingOverride = sequelize.define(
    'CommuneShippingOverride',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      adminId: { type: DataTypes.INTEGER, allowNull: true },
      deliveryCompanyId: { type: DataTypes.INTEGER, allowNull: false },
      communeId: { type: DataTypes.INTEGER, allowNull: false },
      homeDeliveryPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      deskDeliveryPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      homeDeliveryAvailable: { type: DataTypes.BOOLEAN, allowNull: true },
      deskDeliveryAvailable: { type: DataTypes.BOOLEAN, allowNull: true },
      surcharge: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      tableName: 'commune_shipping_overrides',
      indexes: [
        { unique: true, fields: ['delivery_company_id', 'commune_id'] },
        { fields: ['commune_id'] },
      ],
    },
  );

  CommuneShippingOverride.associate = (models) => {
    CommuneShippingOverride.belongsTo(models.DeliveryCompany, { foreignKey: 'deliveryCompanyId', as: 'deliveryCompany' });
    CommuneShippingOverride.belongsTo(models.Commune, { foreignKey: 'communeId', as: 'commune' });
  };

  return CommuneShippingOverride;
};
