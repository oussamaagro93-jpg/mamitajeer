module.exports = (sequelize, DataTypes) => {
  const ProductVariant = sequelize.define(
    'ProductVariant',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      sku: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      comparePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      costPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      option1: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      option2: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      option3: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      image: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'product_variants',
      indexes: [
        { unique: true, fields: ['sku'] },
        { fields: ['product_id'] },
      ],
    },
  );

  ProductVariant.associate = (models) => {
    ProductVariant.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  };

  return ProductVariant;
};
