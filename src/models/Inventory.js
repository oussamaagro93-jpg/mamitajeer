module.exports = (sequelize, DataTypes) => {
  const Inventory = sequelize.define(
    'Inventory',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      adminId: { type: DataTypes.INTEGER, allowNull: true },
      productId: { type: DataTypes.INTEGER, allowNull: false },
      variantId: { type: DataTypes.INTEGER, allowNull: true },
      warehouseId: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
      reservedQuantity: { type: DataTypes.INTEGER, defaultValue: 0 },
      availableQuantity: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.quantity - this.reservedQuantity;
        },
      },
    },
    {
      tableName: 'inventory',
      indexes: [
        { unique: true, fields: ['product_id', 'variant_id', 'warehouse_id'] },
        { fields: ['warehouse_id'] },
      ],
    },
  );

  Inventory.associate = (models) => {
    Inventory.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    Inventory.belongsTo(models.Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
  };

  return Inventory;
};
