module.exports = (sequelize, DataTypes) => {
  const DeliveryCompany = sequelize.define(
    'DeliveryCompany',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      adminId: { type: DataTypes.INTEGER, allowNull: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      code: { type: DataTypes.STRING(50), allowNull: false },
      logo: { type: DataTypes.STRING(500), allowNull: true },
      phone: { type: DataTypes.STRING(20), allowNull: true },
      website: { type: DataTypes.STRING(500), allowNull: true },
      contactPerson: { type: DataTypes.STRING(200), allowNull: true },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      tableName: 'delivery_companies',
      indexes: [
        { unique: true, fields: ['admin_id', 'code'], where: { deleted_at: null } },
        { fields: ['active'] },
      ],
    },
  );

  DeliveryCompany.associate = (models) => {
    DeliveryCompany.hasMany(models.ShippingRate, { foreignKey: 'deliveryCompanyId', as: 'rates' });
    DeliveryCompany.hasMany(models.CommuneShippingOverride, { foreignKey: 'deliveryCompanyId', as: 'communeOverrides' });
    DeliveryCompany.hasMany(models.Order, { foreignKey: 'deliveryCompanyId', as: 'orders' });
    DeliveryCompany.hasMany(models.Product, { foreignKey: 'deliveryCompanyId', as: 'products' });
  };

  return DeliveryCompany;
};
