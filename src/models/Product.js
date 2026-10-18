module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: {
        type: DataTypes.STRING(300),
        allowNull: false,
      },
      sku: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      barcode: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
      },
      slug: {
        type: DataTypes.STRING(300),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      shortDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      brandId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      vendor: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM('simple', 'variable', 'grouped'),
        defaultValue: 'simple',
      },
      unit: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
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
      lowStockThreshold: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
      },
      weight: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      weightUnit: {
        type: DataTypes.STRING(10),
        defaultValue: 'kg',
      },
      length: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      width: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      height: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      isFeatured: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isPhysical: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      status: {
        type: DataTypes.ENUM('draft', 'published', 'archived'),
        defaultValue: 'draft',
      },
      visibleIndividually: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      metaTitle: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      metaDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      image: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      imagePublicId: {
        type: DataTypes.STRING(300),
        allowNull: true,
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'products',
      indexes: [
        { unique: true, fields: ['sku'] },
        { unique: true, fields: ['slug'] },
        { fields: ['category_id'] },
        { fields: ['brand_id'] },
        { fields: ['status'] },
        { fields: ['is_featured'] },
      ],
    },
  );

  Product.associate = (models) => {
    Product.belongsTo(models.Category, { foreignKey: 'categoryId', as: 'category' });
    Product.belongsTo(models.Brand, { foreignKey: 'brandId', as: 'brand' });
    Product.hasMany(models.ProductImage, { foreignKey: 'productId', as: 'images', order: [['sortOrder', 'ASC']] });
    Product.hasMany(models.ProductVariant, { foreignKey: 'productId', as: 'variants' });
    Product.hasMany(models.Review, { foreignKey: 'productId', as: 'reviews' });
    Product.hasMany(models.WishlistItem, { foreignKey: 'productId', as: 'wishlistItems' });
    Product.hasMany(models.OrderItem, { foreignKey: 'productId', as: 'orderItems' });
    Product.hasMany(models.Inventory, { foreignKey: 'productId', as: 'inventoryItems' });
    Product.belongsToMany(models.Product, {
      through: models.RelatedProduct,
      as: 'relatedProducts',
      foreignKey: 'productId',
      otherKey: 'relatedProductId',
    });
  };

  return Product;
};
