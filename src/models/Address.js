module.exports = (sequelize, DataTypes) => {
  const Address = sequelize.define(
    'Address',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      label: { type: DataTypes.STRING(100), defaultValue: 'Home' },
      firstName: { type: DataTypes.STRING(100), allowNull: false },
      lastName: { type: DataTypes.STRING(100), allowNull: false },
      company: { type: DataTypes.STRING(200), allowNull: true },
      addressLine1: { type: DataTypes.STRING(300), allowNull: false },
      addressLine2: { type: DataTypes.STRING(300), allowNull: true },
      city: { type: DataTypes.STRING(100), allowNull: false },
      state: { type: DataTypes.STRING(100), allowNull: false },
      postalCode: { type: DataTypes.STRING(20), allowNull: false },
      country: { type: DataTypes.STRING(100), allowNull: false },
      phone: { type: DataTypes.STRING(20), allowNull: true },
      isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    { tableName: 'addresses', indexes: [{ fields: ['user_id'] }] },
  );

  Address.associate = (models) => {
    Address.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return Address;
};
