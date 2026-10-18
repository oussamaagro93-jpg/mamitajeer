module.exports = (sequelize, DataTypes) => {
  const InventoryTransfer = sequelize.define(
    'InventoryTransfer',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      productId: { type: DataTypes.INTEGER, allowNull: false },
      fromWarehouseId: { type: DataTypes.INTEGER, allowNull: false },
      toWarehouseId: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false },
      reference: { type: DataTypes.STRING(200), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
        defaultValue: 'pending',
      },
      transferredBy: { type: DataTypes.INTEGER, allowNull: true },
    },
    { tableName: 'inventory_transfers', indexes: [{ fields: ['product_id'] }, { fields: ['from_warehouse_id'] }, { fields: ['to_warehouse_id'] }] },
  );

  InventoryTransfer.associate = (models) => {
    InventoryTransfer.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    InventoryTransfer.belongsTo(models.Warehouse, { foreignKey: 'fromWarehouseId', as: 'fromWarehouse' });
    InventoryTransfer.belongsTo(models.Warehouse, { foreignKey: 'toWarehouseId', as: 'toWarehouse' });
  };

  return InventoryTransfer;
};
