const { Inventory, Warehouse, Product, InventoryTransfer } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta } = require('../utils/helpers');

class InventoryService {
  async findAll(query) {
    const { page, limit, offset } = paginate(query);
    const { warehouseId, productId } = query;
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;

    const result = await Inventory.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: Warehouse, as: 'warehouse' },
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] },
      ],
    });
    return { items: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async getLowStock(query) {
    const { page, limit, offset } = paginate(query);
    const { Op } = require('sequelize');
    const result = await Product.findAndCountAll({
      where: { quantity: { [Op.lte]: Op.col('low_stock_threshold') } },
      limit,
      offset,
    });
    return { products: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async adjustStock(productId, warehouseId, quantity, type, reason) {
    let inventory = await Inventory.findOne({ where: { productId, warehouseId } });
    if (!inventory) {
      inventory = await Inventory.create({ productId, warehouseId, quantity: 0 });
    }
    const change = type === 'add' ? quantity : -quantity;
    await inventory.update({ quantity: inventory.quantity + change });
    await Product.increment('quantity', { by: change, where: { id: productId } });
    return inventory;
  }

  async transfer(data) {
    const { productId, fromWarehouseId, toWarehouseId, quantity, notes, transferredBy } = data;
    const fromInventory = await Inventory.findOne({ where: { productId, warehouseId: fromWarehouseId } });
    if (!fromInventory || fromInventory.quantity < quantity) {
      throw new ApiError(400, 'Insufficient stock');
    }
    await fromInventory.update({ quantity: fromInventory.quantity - quantity });
    let toInventory = await Inventory.findOne({ where: { productId, warehouseId: toWarehouseId } });
    if (!toInventory) {
      toInventory = await Inventory.create({ productId, warehouseId: toWarehouseId, quantity: 0 });
    }
    await toInventory.update({ quantity: toInventory.quantity + quantity });
    return InventoryTransfer.create({ productId, fromWarehouseId, toWarehouseId, quantity, notes, transferredBy, status: 'completed' });
  }

  async delete(id) {
    const inventory = await Inventory.findByPk(id);
    if (!inventory) throw new ApiError(404, 'Inventory item not found');
    await inventory.destroy();
    return true;
  }

  async create(data) {
    const existing = await Inventory.findOne({ where: { productId: data.productId, warehouseId: data.warehouseId } });
    if (existing) throw new ApiError(400, 'Inventory record already exists for this product and warehouse');
    const inventory = await Inventory.create({
      productId: data.productId,
      warehouseId: data.warehouseId,
      quantity: data.quantity || 0,
    });
    await Product.increment('quantity', { by: inventory.quantity, where: { id: data.productId } });
    return Inventory.findByPk(inventory.id, { include: [{ model: Warehouse, as: 'warehouse' }, { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }] });
  }

  async update(id, data) {
    const inventory = await Inventory.findByPk(id);
    if (!inventory) throw new ApiError(404, 'Inventory item not found');
    const oldQty = inventory.quantity;
    await inventory.update({ quantity: data.quantity });
    const diff = data.quantity - oldQty;
    await Product.increment('quantity', { by: diff, where: { id: inventory.productId } });
    return Inventory.findByPk(id, { include: [{ model: Warehouse, as: 'warehouse' }, { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }] });
  }
}

module.exports = new InventoryService();
