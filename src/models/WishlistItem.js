module.exports = (sequelize, DataTypes) => {
  const WishlistItem = sequelize.define(
    'WishlistItem',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      productId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { tableName: 'wishlist_items', indexes: [{ unique: true, fields: ['user_id', 'product_id'] }] },
  );

  WishlistItem.associate = (models) => {
    WishlistItem.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    WishlistItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  };

  return WishlistItem;
};
