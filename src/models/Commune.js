module.exports = (sequelize, DataTypes) => {
  const Commune = sequelize.define(
    'Commune',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      wilayaId: { type: DataTypes.INTEGER, allowNull: false },
      code: { type: DataTypes.STRING(20), allowNull: true },
      nameAr: { type: DataTypes.STRING(200), allowNull: false },
      nameFr: { type: DataTypes.STRING(200), allowNull: false },
      active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      tableName: 'communes',
      indexes: [
        { fields: ['wilaya_id'] },
      ],
    },
  );

  Commune.associate = (models) => {
    Commune.belongsTo(models.Wilaya, { foreignKey: 'wilayaId', as: 'wilaya' });
    Commune.hasMany(models.CommuneShippingOverride, { foreignKey: 'communeId', as: 'shippingOverrides' });
  };

  return Commune;
};
