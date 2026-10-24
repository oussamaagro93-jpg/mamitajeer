module.exports = (sequelize, DataTypes) => {
  const Brand = sequelize.define(
    'Brand',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      adminId: { type: DataTypes.INTEGER, allowNull: true },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      logo: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      website: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'brands',
      indexes: [
        { unique: true, fields: ['admin_id', 'name'], where: { deleted_at: null } },
        { unique: true, fields: ['admin_id', 'slug'], where: { deleted_at: null } },
      ],
    },
  );

  Brand.associate = (models) => {
    Brand.hasMany(models.Product, { foreignKey: 'brandId', as: 'products' });
  };

  return Brand;
};
