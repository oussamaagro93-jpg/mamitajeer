const { Op } = require('sequelize');
const { Inventory, Warehouse, Product, InventoryTransfer } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta } = require('../utils/helpers');
const { tenantWhere, resolveAdminId } = require('../utils/tenant');

class InventoryService {
  async assertOwned(productId, warehouseId, adminId) {
    if (productId) {
      const product = await Product.findOne({ where: { id: productId, adminId } });
      if (!product) throw new ApiError(400, 'Product does not belong to this admin');
    }
    if (warehouseId) {
      const warehouse = await Warehouse.findOne({ where: { id: warehouseId, adminId } });
      if (!warehouse) throw new ApiError(400, 'Warehouse does not belong to this admin');
    }
  }

  async findAll(query, tenantId) {
    const { page, limit, offset } = paginate(query);
    const { warehouseId, productId } = query;
    const where = tenantWhere(tenantId, {});
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;

    const result = await Inventory.findAndCountAll({
      where,
      limit,
      offset,
      include: [
        { model: Warehouse, as: 'warehouse', where: tenantId ? { adminId: tenantId } : undefined, required: !!tenantId },
        { model: Product, as: 'product', attributes: ['id', 'name', 'sku'], where: tenantId ? { adminId: tenantId } : undefined, required: !!tenantId },
      ],
    });
    return { items: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async getLowStock(query, tenantId) {
    const { page, limit, offset } = paginate(query);
    const { Op, literal } = require('sequelize');
    const where = tenantWhere(tenantId, {
      quantity: { [Op.lte]: literal('low_stock_threshold') },
    });
    const result = await Product.findAndCountAll({ where, limit, offset });
    return { products: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async adjustStock(productId, warehouseId, quantity, type, reason, tenantId) {
    const adminId = await resolveAdminId(tenantId);
    const amount = parseInt(quantity, 10);
    if (!Number.isInteger(amount) || amount < 1) {
      throw new ApiError(400, 'Quantity must be a positive integer');
    }
    await this.assertOwned(productId, warehouseId, adminId);

    let inventory = await Inventory.findOne({ where: { productId, warehouseId, adminId } });
    if (!inventory) {
      inventory = await Inventory.create({ productId, warehouseId, quantity: 0, adminId });
    }
    if (type === 'remove' && Number(inventory.quantity) < amount) {
      throw new ApiError(400, 'Insufficient stock');
    }
    const change = type === 'add' ? amount : -amount;
    await inventory.update({ quantity: Number(inventory.quantity) + change });
    await Product.increment('quantity', { by: change, where: { id: productId, adminId } });
    return inventory;
  }

  // Consumes stock from warehouse inventory rows (largest stock first) and
  // returns the allocations so they can be stored on the order item and
  // restored if the order is cancelled or refunded.
  async consumeStock(items, adminId, transaction) {
    const allocations = [];

    for (const item of items) {
      const productId = parseInt(item.productId, 10);
      const quantity = parseInt(item.quantity, 10);
      const rows = await Inventory.findAll({
        where: { productId, adminId, quantity: { [Op.gt]: 0 } },
        order: [['quantity', 'DESC'], ['id', 'ASC']],
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined,
      });

      const available = rows.reduce((sum, row) => sum + Number(row.quantity), 0);
      if (rows.length > 0 && available < quantity) {
        throw new ApiError(400, 'Insufficient warehouse stock for ' + (item.productName || 'one or more products'));
      }

      let remaining = quantity;
      const itemAllocations = [];
      for (const row of rows) {
        if (remaining <= 0) break;
        const take = Math.min(Number(row.quantity), remaining);
        await row.update({ quantity: Number(row.quantity) - take }, { transaction });
        itemAllocations.push({ warehouseId: row.warehouseId, quantity: take });
        remaining -= take;
      }

      allocations.push(itemAllocations);
    }

    return allocations;
  }

  async restoreStock(order, transaction) {
    for (const item of order.items || []) {
      await Product.increment('quantity', {
        by: item.quantity,
        where: { id: item.productId, adminId: order.adminId },
        transaction,
      });

      const itemAllocations = Array.isArray(item.inventoryAllocations)
        ? item.inventoryAllocations
        : [];
      for (const allocation of itemAllocations) {
        let inventory = await Inventory.findOne({
          where: {
            productId: item.productId,
            warehouseId: allocation.warehouseId,
            adminId: order.adminId,
          },
          transaction,
          paranoid: false,
        });

        if (!inventory) {
          inventory = await Inventory.create({
            productId: item.productId,
            warehouseId: allocation.warehouseId,
            quantity: 0,
            adminId: order.adminId,
          }, { transaction });
        } else if (inventory.deletedAt) {
          await inventory.restore({ transaction });
        }

        await inventory.increment('quantity', {
          by: allocation.quantity,
          transaction,
        });
      }
    }
  }

  async transfer(data, tenantId) {
    const { productId, fromWarehouseId, toWarehouseId, quantity, notes, transferredBy } = data;
    const adminId = await resolveAdminId(tenantId);
    await this.assertOwned(productId, fromWarehouseId, adminId);
    await this.assertOwned(productId, toWarehouseId, adminId);

    const fromInventory = await Inventory.findOne({ where: { productId, warehouseId: fromWarehouseId, adminId } });
    if (!fromInventory || fromInventory.quantity < quantity) {
      throw new ApiError(400, 'Insufficient stock');
    }
    await fromInventory.update({ quantity: fromInventory.quantity - quantity });
    let toInventory = await Inventory.findOne({ where: { productId, warehouseId: toWarehouseId, adminId } });
    if (!toInventory) {
      toInventory = await Inventory.create({ productId, warehouseId: toWarehouseId, quantity: 0, adminId });
    }
    await toInventory.update({ quantity: toInventory.quantity + quantity });
    return InventoryTransfer.create({ productId, fromWarehouseId, toWarehouseId, quantity, notes, transferredBy, status: 'completed' });
  }

  async delete(id, tenantId) {
    const inventory = await Inventory.findOne({ where: tenantWhere(tenantId, { id }) });
    if (!inventory) throw new ApiError(404, 'Inventory item not found');
    await inventory.destroy();
    return true;
  }

  async create(data, tenantId) {
    const adminId = await resolveAdminId(tenantId);
    await this.assertOwned(data.productId, data.warehouseId, adminId);

    const quantity = data.quantity === undefined || data.quantity === '' ? 0 : parseInt(data.quantity, 10);
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new ApiError(400, 'Quantity must be a non-negative integer');
    }

    const existing = await Inventory.findOne({ where: { productId: data.productId, warehouseId: data.warehouseId, adminId } });
    if (existing) throw new ApiError(400, 'Inventory record already exists for this product and warehouse');
    const inventory = await Inventory.create({
      productId: data.productId,
      warehouseId: data.warehouseId,
      quantity,
      adminId,
    });
    await Product.increment('quantity', { by: inventory.quantity, where: { id: data.productId, adminId } });
    return Inventory.findByPk(inventory.id, { include: [{ model: Warehouse, as: 'warehouse' }, { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }] });
  }

  async update(id, data, tenantId) {
    const inventory = await Inventory.findOne({ where: tenantWhere(tenantId, { id }) });
    if (!inventory) throw new ApiError(404, 'Inventory item not found');

    const quantity = parseInt(data.quantity, 10);
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new ApiError(400, 'Quantity must be a non-negative integer');
    }

    const oldQty = Number(inventory.quantity);
    await inventory.update({ quantity });
    const diff = quantity - oldQty;
    await Product.increment('quantity', { by: diff, where: { id: inventory.productId, adminId: inventory.adminId } });
    return Inventory.findByPk(id, { include: [{ model: Warehouse, as: 'warehouse' }, { model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }] });
  }
}

module.exports = new InventoryService();
