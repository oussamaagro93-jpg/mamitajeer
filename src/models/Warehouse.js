module.exports = (sequelize, DataTypes) => {
  const Warehouse = sequelize.define(
    'Warehouse',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      adminId: { type: DataTypes.INTEGER, allowNull: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      code: { type: DataTypes.STRING(50), allowNull: false },
      address: { type: DataTypes.TEXT, allowNull: true },
      city: { type: DataTypes.STRING(100), allowNull: true },
      state: { type: DataTypes.STRING(100), allowNull: true },
      country: { type: DataTypes.STRING(100), allowNull: true },
      phone: { type: DataTypes.STRING(20), allowNull: true },
      email: { type: DataTypes.STRING(255), allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { tableName: 'warehouses', indexes: [{ unique: true, fields: ['admin_id', 'code'], where: { deleted_at: null } }] },
  );

  Warehouse.associate = (models) => {
    Warehouse.hasMany(models.Inventory, { foreignKey: 'warehouseId', as: 'inventoryItems' });
  };

  return Warehouse;
};
