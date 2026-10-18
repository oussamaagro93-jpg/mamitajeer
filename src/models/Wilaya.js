module.exports = (sequelize, DataTypes) => {
  const Wilaya = sequelize.define(
    'Wilaya',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(10), allowNull: false, unique: true },
      nameAr: { type: DataTypes.STRING(200), allowNull: false },
      nameFr: { type: DataTypes.STRING(200), allowNull: false },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      tableName: 'wilayas',
      indexes: [
        { unique: true, fields: ['code'] },
      ],
    },
  );

  Wilaya.associate = (models) => {
    Wilaya.hasMany(models.Commune, { foreignKey: 'wilayaId', as: 'communes' });
    Wilaya.hasMany(models.ShippingRate, { foreignKey: 'wilayaId', as: 'rates' });
    Wilaya.hasMany(models.Order, { foreignKey: 'wilayaId', as: 'orders' });
  };

  return Wilaya;
};
