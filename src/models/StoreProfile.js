module.exports = (sequelize, DataTypes) => {
  const StoreProfile = sequelize.define(
    'StoreProfile',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      adminId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING(200), allowNull: true },
      logo: { type: DataTypes.STRING(500), allowNull: true },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      whatsapp: { type: DataTypes.STRING(30), allowNull: true },
      email: { type: DataTypes.STRING(255), allowNull: true },
      address: { type: DataTypes.TEXT, allowNull: true },
      facebook: { type: DataTypes.STRING(500), allowNull: true },
      instagram: { type: DataTypes.STRING(500), allowNull: true },
      x: { type: DataTypes.STRING(500), allowNull: true },
    },
    {
      tableName: 'store_profiles',
      indexes: [
        { unique: true, fields: ['admin_id'], where: { deleted_at: null } },
      ],
    },
  );

  StoreProfile.associate = (models) => {
    StoreProfile.belongsTo(models.User, { foreignKey: 'adminId', as: 'admin' });
  };

  return StoreProfile;
};
