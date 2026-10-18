module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      type: { type: DataTypes.STRING(50), allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      data: { type: DataTypes.JSONB, allowNull: true },
      isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
      readAt: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'notifications', indexes: [{ fields: ['user_id'] }, { fields: ['is_read'] }] },
  );

  Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return Notification;
};
