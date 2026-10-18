module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define(
    'Review',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      productId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
      title: { type: DataTypes.STRING(200), allowNull: true },
      content: { type: DataTypes.TEXT, allowNull: true },
      isApproved: { type: DataTypes.BOOLEAN, defaultValue: false },
      isVerifiedPurchase: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: 'reviews', indexes: [{ fields: ['product_id'] }, { fields: ['user_id'] }] },
  );

  Review.associate = (models) => {
    Review.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    Review.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return Review;
};
