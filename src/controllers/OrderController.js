const orderService = require('../services/OrderService');
const couponService = require('../services/CouponService');
const { sendSuccess } = require('../utils/response');

class OrderController {
  async index(req, res, next) {
    try {
      const data = await orderService.findAll(req.query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const order = await orderService.findById(req.params.id);
      sendSuccess(res, { order });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const order = await orderService.create(req.body, req.userId);
      sendSuccess(res, { order }, 'Order created', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { status, description } = req.body;
      const order = await orderService.updateStatus(req.params.id, status, req.userId, description);
      sendSuccess(res, { order }, 'Order status updated');
    } catch (error) {
      next(error);
    }
  }

  async validateCoupon(req, res, next) {
    try {
      const { code, orderAmount } = req.body;
      const result = await couponService.validate(code, orderAmount);
      sendSuccess(res, result, 'Coupon is valid');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await orderService.delete(req.params.id);
      sendSuccess(res, null, 'Order deleted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();
