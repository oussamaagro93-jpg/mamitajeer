module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define(
    'OrderItem',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      orderId: { type: DataTypes.INTEGER, allowNull: false },
      productId: { type: DataTypes.INTEGER, allowNull: false },
      variantId: { type: DataTypes.INTEGER, allowNull: true },
      productName: { type: DataTypes.STRING(300), allowNull: false },
      sku: { type: DataTypes.STRING(100), allowNull: true },
      variantName: { type: DataTypes.STRING(200), allowNull: true },
      image: { type: DataTypes.STRING(500), allowNull: true },
      quantity: { type: DataTypes.INTEGER, allowNull: false },
      unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      taxRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
      taxAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      discountAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    },
    { tableName: 'order_items', indexes: [{ fields: ['order_id'] }, { fields: ['product_id'] }] },
  );

  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
    OrderItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  };

  return OrderItem;
};
