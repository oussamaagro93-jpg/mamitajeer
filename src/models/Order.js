module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    'Order',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      adminId: { type: DataTypes.INTEGER, allowNull: true },
      orderNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      email: { type: DataTypes.STRING(255), allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'),
        defaultValue: 'pending',
      },
      paymentStatus: {
        type: DataTypes.ENUM('pending', 'paid', 'partially_paid', 'refunded', 'failed'),
        defaultValue: 'pending',
      },
      shippingStatus: {
        type: DataTypes.ENUM('not_shipped', 'partially_shipped', 'shipped', 'delivered'),
        defaultValue: 'not_shipped',
      },
      subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      shippingCost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      taxAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      discountAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      couponId: { type: DataTypes.INTEGER, allowNull: true },
      couponCode: { type: DataTypes.STRING(50), allowNull: true },
      stockRestored: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      paidAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      dueAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
      currency: { type: DataTypes.STRING(3), defaultValue: 'DZD' },
      paymentMethod: { type: DataTypes.STRING(100), allowNull: true },
      paymentReference: { type: DataTypes.STRING(255), allowNull: true },
      shippingMethod: { type: DataTypes.STRING(200), allowNull: true },
      trackingNumber: { type: DataTypes.STRING(200), allowNull: true },
      shippingAddressId: { type: DataTypes.INTEGER, allowNull: true },
      billingAddressId: { type: DataTypes.INTEGER, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      internalNotes: { type: DataTypes.TEXT, allowNull: true },
      guestName: { type: DataTypes.STRING(200), allowNull: true },
      guestPhone: { type: DataTypes.STRING(20), allowNull: true },
      guestWilaya: { type: DataTypes.STRING(100), allowNull: true },
      guestCity: { type: DataTypes.STRING(100), allowNull: true },
      guestAddress: { type: DataTypes.TEXT, allowNull: true },
      isGift: { type: DataTypes.BOOLEAN, defaultValue: false },
      giftMessage: { type: DataTypes.TEXT, allowNull: true },
      deliveryCompanyId: { type: DataTypes.INTEGER, allowNull: true },
      deliveryCompanyName: { type: DataTypes.STRING(200), allowNull: true },
      deliveryType: { type: DataTypes.ENUM('home_delivery', 'desk_delivery'), allowNull: true },
      wilayaId: { type: DataTypes.INTEGER, allowNull: true },
      wilayaName: { type: DataTypes.STRING(200), allowNull: true },
      communeId: { type: DataTypes.INTEGER, allowNull: true },
      communeName: { type: DataTypes.STRING(200), allowNull: true },
      deliveryAddress: { type: DataTypes.TEXT, allowNull: true },
      cancelledAt: { type: DataTypes.DATE, allowNull: true },
      cancelledReason: { type: DataTypes.STRING(500), allowNull: true },
      refundedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'orders',
      indexes: [
        { unique: true, fields: ['order_number'] },
        { fields: ['user_id'] },
        { fields: ['status'] },
        { fields: ['payment_status'] },
      ],
    },
  );

  Order.associate = (models) => {
    Order.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Order.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'items' });
    Order.hasMany(models.OrderTimeline, { foreignKey: 'orderId', as: 'timeline', order: [['createdAt', 'DESC']] });
    Order.hasOne(models.Invoice, { foreignKey: 'orderId', as: 'invoice' });
    Order.belongsTo(models.DeliveryCompany, { foreignKey: 'deliveryCompanyId', as: 'deliveryCompany' });
    Order.belongsTo(models.Wilaya, { foreignKey: 'wilayaId', as: 'wilaya' });
    Order.belongsTo(models.Commune, { foreignKey: 'communeId', as: 'commune' });
    Order.belongsTo(models.Coupon, { foreignKey: 'couponId', as: 'coupon' });
  };

  return Order;
};
