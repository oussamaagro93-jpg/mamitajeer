const couponService = require('../services/CouponService');
const { sendSuccess } = require('../utils/response');

class CouponController {
  async index(req, res, next) {
    try {
      const data = await couponService.findAll(req.query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const coupon = await couponService.findById(req.params.id);
      sendSuccess(res, { coupon });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const coupon = await couponService.create(req.body);
      sendSuccess(res, { coupon }, 'Coupon created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const coupon = await couponService.update(req.params.id, req.body);
      sendSuccess(res, { coupon }, 'Coupon updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await couponService.delete(req.params.id);
      sendSuccess(res, null, 'Coupon deleted');
    } catch (error) {
      next(error);
    }
  }

  async validate(req, res, next) {
    try {
      const { code, orderAmount } = req.body;
      const result = await couponService.validate(code, orderAmount);
      sendSuccess(res, result, 'Coupon is valid');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CouponController();
