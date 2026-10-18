const inventoryService = require('../services/InventoryService');
const { sendSuccess } = require('../utils/response');

class InventoryController {
  async index(req, res, next) {
    try {
      const data = await inventoryService.findAll(req.query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async lowStock(req, res, next) {
    try {
      const data = await inventoryService.getLowStock(req.query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async adjust(req, res, next) {
    try {
      const { productId, warehouseId, quantity, type, reason } = req.body;
      const inventory = await inventoryService.adjustStock(productId, warehouseId, quantity, type, reason);
      sendSuccess(res, { inventory }, 'Stock adjusted');
    } catch (error) {
      next(error);
    }
  }

  async transfer(req, res, next) {
    try {
      const transfer = await inventoryService.transfer({ ...req.body, transferredBy: req.userId });
      sendSuccess(res, { transfer }, 'Stock transferred');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await inventoryService.delete(req.params.id);
      sendSuccess(res, null, 'Inventory item deleted');
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const inventory = await inventoryService.create(req.body);
      sendSuccess(res, { inventory }, 'Inventory item created');
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const inventory = await inventoryService.update(req.params.id, req.body);
      sendSuccess(res, { inventory }, 'Inventory item updated');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InventoryController();
