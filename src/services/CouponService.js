const { Coupon } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta } = require('../utils/helpers');

class CouponService {
  async findAll(query) {
    const { page, limit, offset } = paginate(query);
    const { search, isActive } = query;
    const where = {};
    if (search) where.code = { [require('sequelize').Op.iLike]: `%${search}%` };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const result = await Coupon.findAndCountAll({ where, limit, offset, order: [['createdAt', 'DESC']] });
    return { coupons: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async findById(id) {
    const coupon = await Coupon.findByPk(id);
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    return coupon;
  }

  async create(data) {
    const existing = await Coupon.findOne({ where: { code: data.code } });
    if (existing) throw new ApiError(400, 'Coupon code already exists');
    return Coupon.create(data);
  }

  async update(id, data) {
    const coupon = await Coupon.findByPk(id);
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    return coupon.update(data);
  }

  async delete(id) {
    const coupon = await Coupon.findByPk(id);
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    await coupon.destroy();
    return true;
  }

  async validate(code, orderAmount) {
    const coupon = await Coupon.findOne({ where: { code, isActive: true } });
    if (!coupon) throw new ApiError(400, 'Invalid coupon code');
    if (coupon.endDate && new Date(coupon.endDate) < new Date()) throw new ApiError(400, 'Coupon expired');
    if (coupon.startDate && new Date(coupon.startDate) > new Date()) throw new ApiError(400, 'Coupon not yet valid');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new ApiError(400, 'Coupon usage limit reached');
    if (orderAmount < coupon.minOrderAmount) throw new ApiError(400, `Minimum order amount of $${coupon.minOrderAmount} required`);

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (orderAmount * coupon.value) / 100;
      if (coupon.maxDiscountAmount) discount = Math.min(discount, parseFloat(coupon.maxDiscountAmount));
    } else if (coupon.type === 'fixed') {
      discount = parseFloat(coupon.value);
    }
    return { coupon, discount };
  }
}

module.exports = new CouponService();
