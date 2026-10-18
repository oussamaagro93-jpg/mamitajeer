module.exports = (sequelize, DataTypes) => {
  const OrderTimeline = sequelize.define(
    'OrderTimeline',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      orderId: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.STRING(50), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      performedBy: { type: DataTypes.STRING(100), allowNull: true },
    },
    { tableName: 'order_timelines', indexes: [{ fields: ['order_id'] }] },
  );

  OrderTimeline.associate = (models) => {
    OrderTimeline.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
  };

  return OrderTimeline;
};
