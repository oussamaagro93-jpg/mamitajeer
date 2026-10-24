const inventoryService = require('../services/InventoryService');
const { sendSuccess } = require('../utils/response');

class InventoryController {
  async index(req, res, next) {
    try {
      const data = await inventoryService.findAll(req.query, req.tenantAdminId);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async lowStock(req, res, next) {
    try {
      const data = await inventoryService.getLowStock(req.query, req.tenantAdminId);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async adjust(req, res, next) {
    try {
      const { productId, warehouseId, quantity, type, reason } = req.body;
      const inventory = await inventoryService.adjustStock(productId, warehouseId, quantity, type, reason, req.tenantAdminId);
      sendSuccess(res, { inventory }, 'Stock adjusted');
    } catch (error) {
      next(error);
    }
  }

  async transfer(req, res, next) {
    try {
      const transfer = await inventoryService.transfer({ ...req.body, transferredBy: req.userId }, req.tenantAdminId);
      sendSuccess(res, { transfer }, 'Stock transferred');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await inventoryService.delete(req.params.id, req.tenantAdminId);
      sendSuccess(res, null, 'Inventory item deleted');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const inventory = await inventoryService.create(req.body, req.tenantAdminId);
      sendSuccess(res, { inventory }, 'Inventory item created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const inventory = await inventoryService.update(req.params.id, req.body, req.tenantAdminId);
      sendSuccess(res, { inventory }, 'Inventory item updated');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InventoryController();
