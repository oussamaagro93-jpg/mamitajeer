module.exports = (sequelize, DataTypes) => {
  const ProductImage = sequelize.define(
    'ProductImage',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      publicId: {
        type: DataTypes.STRING(300),
        allowNull: true,
      },
      thumbnailUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      alt: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      isPrimary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      tableName: 'product_images',
      indexes: [{ fields: ['product_id'] }],
    },
  );

  ProductImage.associate = (models) => {
    ProductImage.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  };

  return ProductImage;
};
