module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define(
    'Invoice',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      orderId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      invoiceNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      dueDate: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled'),
        defaultValue: 'draft',
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      pdfUrl: { type: DataTypes.STRING(500), allowNull: true },
    },
    { tableName: 'invoices', indexes: [{ unique: true, fields: ['invoice_number'] }] },
  );

  Invoice.associate = (models) => {
    Invoice.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
  };

  return Invoice;
};
