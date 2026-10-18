module.exports = (sequelize, DataTypes) => {
  const RelatedProduct = sequelize.define(
    'RelatedProduct',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      relatedProductId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      tableName: 'related_products',
      indexes: [
        { fields: ['product_id'] },
        { fields: ['related_product_id'] },
      ],
    },
  );

  RelatedProduct.associate = (models) => {
    RelatedProduct.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    RelatedProduct.belongsTo(models.Product, { foreignKey: 'relatedProductId', as: 'relatedProduct' });
  };

  return RelatedProduct;
};
