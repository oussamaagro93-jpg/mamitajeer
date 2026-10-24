const { Op } = require('sequelize');
const {
  sequelize,
  Coupon,
  CouponProduct,
  CouponCategory,
  Product,
  Category,
  Order,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta, roundMoney } = require('../utils/helpers');
const { tenantWhere, resolveAdminId } = require('../utils/tenant');

const RESTRICTION_INCLUDE = [
  {
    model: Product,
    as: 'products',
    attributes: ['id'],
    through: { attributes: [] },
    required: false,
  },
  {
    model: Category,
    as: 'categories',
    attributes: ['id'],
    through: { attributes: [] },
    required: false,
  },
];

function toIntList(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => parseInt(entry, 10))
        .filter((entry) => Number.isInteger(entry) && entry > 0),
    ),
  );
}

function parseOptionalInt(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) throw new ApiError(400, 'Invalid numeric value');
  return parsed;
}

function parseOptionalMoney(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new ApiError(400, `Invalid ${label}`);
  return roundMoney(parsed);
}

function parseOptionalDate(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, `Invalid ${label}`);
  return date;
}

class CouponService {
  normalizeCode(code) {
    return String(code || '').trim().toUpperCase();
  }

  normalizePhone(phone) {
    return String(phone || '').replace(/[^\d+]/g, '');
  }

  present(coupon, restrictionSets) {
    const json = coupon.toJSON ? coupon.toJSON() : { ...coupon };

    if (restrictionSets) {
      json.productIds = Array.from(restrictionSets.productIds);
      json.categoryIds = Array.from(restrictionSets.categoryIds);
    } else {
      if (Array.isArray(json.products)) json.productIds = json.products.map((p) => p.id);
      if (Array.isArray(json.categories)) json.categoryIds = json.categories.map((c) => c.id);
    }

    delete json.products;
    delete json.categories;
    return json;
  }

  async loadRestrictionSets(couponId, transaction) {
    const [products, categories] = await Promise.all([
      CouponProduct.findAll({
        where: { couponId },
        attributes: ['productId'],
        transaction,
      }),
      CouponCategory.findAll({
        where: { couponId },
        attributes: ['categoryId'],
        transaction,
      }),
    ]);

    return {
      productIds: new Set(products.map((row) => Number(row.productId))),
      categoryIds: new Set(categories.map((row) => Number(row.categoryId))),
    };
  }

  async findAll(query, tenantId) {
    const { page, limit, offset } = paginate(query);
    const { search, isActive } = query;
    const where = tenantWhere(tenantId, {});
    if (search) where.code = { [Op.iLike]: `%${search}%` };
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const result = await Coupon.findAndCountAll({
      where,
      include: RESTRICTION_INCLUDE,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    return {
      coupons: result.rows.map((coupon) => this.present(coupon)),
      pagination: getPaginationMeta(result.count, page, limit),
    };
  }

  async findById(id, tenantId) {
    const coupon = await Coupon.findOne({
      where: tenantWhere(tenantId, { id }),
      include: RESTRICTION_INCLUDE,
    });
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    return this.present(coupon);
  }

  normalizePayload(data, existing) {
    const type = data.type || (existing && existing.type);
    if (['percentage', 'fixed', 'free_shipping'].indexOf(type) === -1) {
      throw new ApiError(400, 'Invalid coupon type');
    }

    let value = data.value !== undefined ? data.value : existing && existing.value;
    value = value === '' || value === null || value === undefined ? 0 : Number(value);
    if (!Number.isFinite(value) || value < 0) throw new ApiError(400, 'Invalid coupon value');
    if (type === 'percentage' && value > 100) {
      throw new ApiError(400, 'Percentage discount cannot exceed 100');
    }
    if (type === 'free_shipping') value = 0;

    const code = data.code !== undefined
      ? this.normalizeCode(data.code)
      : existing && existing.code;
    if (!code) throw new ApiError(400, 'Coupon code is required');
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      throw new ApiError(400, 'Coupon code may only contain letters, numbers, underscores and dashes');
    }

    const minOrderAmount = data.minOrderAmount !== undefined
      ? (parseOptionalMoney(data.minOrderAmount, 'minimum order amount') || 0)
      : (existing ? Number(existing.minOrderAmount || 0) : 0);
    const maxDiscountAmount = data.maxDiscountAmount !== undefined
      ? parseOptionalMoney(data.maxDiscountAmount, 'maximum discount amount')
      : (existing ? existing.maxDiscountAmount : null);

    const usageLimit = data.usageLimit !== undefined
      ? parseOptionalInt(data.usageLimit)
      : (existing ? existing.usageLimit : null);
    const perUserLimit = data.perUserLimit !== undefined
      ? parseOptionalInt(data.perUserLimit)
      : (existing ? existing.perUserLimit : 1);

    const startDate = data.startDate !== undefined
      ? parseOptionalDate(data.startDate, 'start date')
      : (existing ? existing.startDate : null);
    const endDate = data.endDate !== undefined
      ? parseOptionalDate(data.endDate, 'end date')
      : (existing ? existing.endDate : null);
    if (startDate && endDate && startDate > endDate) {
      throw new ApiError(400, 'End date must be after the start date');
    }

    if (usageLimit !== null && existing && Number(existing.usedCount) > usageLimit) {
      throw new ApiError(400, 'Usage limit cannot be lower than the current usage count');
    }

    let isActive = existing ? existing.isActive : true;
    if (data.isActive !== undefined) {
      isActive = data.isActive === true || data.isActive === 'true' || data.isActive === 1;
    }

    return {
      code,
      type,
      value: roundMoney(value),
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      perUserLimit: perUserLimit === null ? 1 : perUserLimit,
      startDate,
      endDate,
      isActive,
      description: data.description !== undefined
        ? (data.description || null)
        : (existing ? existing.description : null),
    };
  }

  async replaceRestrictions(coupon, data, adminId, transaction) {
    const productIds = toIntList(data.productIds);
    const categoryIds = toIntList(data.categoryIds);

    if (productIds.length > 0) {
      const products = await Product.findAll({
        where: { id: { [Op.in]: productIds }, adminId },
        attributes: ['id'],
        transaction,
      });
      if (products.length !== productIds.length) {
        throw new ApiError(400, 'One or more products do not belong to this store');
      }
    }

    if (categoryIds.length > 0) {
      const categories = await Category.findAll({
        where: { id: { [Op.in]: categoryIds }, adminId },
        attributes: ['id'],
        transaction,
      });
      if (categories.length !== categoryIds.length) {
        throw new ApiError(400, 'One or more categories do not belong to this store');
      }
    }

    await CouponProduct.destroy({ where: { couponId: coupon.id }, transaction });
    await CouponCategory.destroy({ where: { couponId: coupon.id }, transaction });

    if (productIds.length > 0) {
      await CouponProduct.bulkCreate(
        productIds.map((productId) => ({ couponId: coupon.id, productId })),
        { transaction },
      );
    }
    if (categoryIds.length > 0) {
      await CouponCategory.bulkCreate(
        categoryIds.map((categoryId) => ({ couponId: coupon.id, categoryId })),
        { transaction },
      );
    }
  }

  async create(data, tenantId) {
    const adminId = await resolveAdminId(tenantId);
    if (!adminId) throw new ApiError(400, 'An admin account is required to create a coupon');

    const payload = this.normalizePayload(data);
    const existing = await Coupon.findOne({ where: { code: payload.code, adminId }, paranoid: false });
    if (existing) throw new ApiError(400, 'Coupon code already exists');

    const coupon = await sequelize.transaction(async (transaction) => {
      const created = await Coupon.create(
        { ...payload, adminId },
        { transaction },
      );
      await this.replaceRestrictions(created, data, adminId, transaction);
      return created;
    });

    return this.findById(coupon.id, tenantId);
  }

  async update(id, data, tenantId) {
    const coupon = await Coupon.findOne({ where: tenantWhere(tenantId, { id }) });
    if (!coupon) throw new ApiError(404, 'Coupon not found');

    const payload = this.normalizePayload(data, coupon);
    if (payload.code !== coupon.code) {
      const existing = await Coupon.findOne({
        where: { code: payload.code, adminId: coupon.adminId, id: { [Op.ne]: coupon.id } },
        paranoid: false,
      });
      if (existing) throw new ApiError(400, 'Coupon code already exists');
    }

    await sequelize.transaction(async (transaction) => {
      await coupon.update(payload, { transaction });
      const hasProductIds = Object.prototype.hasOwnProperty.call(data, 'productIds');
      const hasCategoryIds = Object.prototype.hasOwnProperty.call(data, 'categoryIds');
      if (hasProductIds || hasCategoryIds) {
        await this.replaceRestrictions(
          coupon,
          {
            productIds: hasProductIds ? data.productIds : [],
            categoryIds: hasCategoryIds ? data.categoryIds : [],
          },
          coupon.adminId,
          transaction,
        );
      }
    });

    return this.findById(coupon.id, tenantId);
  }

  async delete(id, tenantId) {
    const coupon = await Coupon.findOne({ where: tenantWhere(tenantId, { id }) });
    if (!coupon) throw new ApiError(404, 'Coupon not found');
    await coupon.destroy();
    return true;
  }

  validateState(coupon, subtotal) {
    const now = Date.now();
    if (!coupon.isActive) throw new ApiError(400, 'Coupon is not active');
    if (coupon.startDate && new Date(coupon.startDate).getTime() > now) {
      throw new ApiError(400, 'Coupon is not yet valid');
    }
    if (coupon.endDate && new Date(coupon.endDate).getTime() < now) {
      throw new ApiError(400, 'Coupon has expired');
    }

    const usageLimit = coupon.usageLimit === null || coupon.usageLimit === undefined
      ? null
      : parseInt(coupon.usageLimit, 10);
    if (usageLimit !== null && Number(coupon.usedCount || 0) >= usageLimit) {
      throw new ApiError(400, 'Coupon usage limit reached');
    }

    const minimum = Number(coupon.minOrderAmount || 0);
    if (roundMoney(subtotal) < minimum) {
      throw new ApiError(400, `Minimum order amount of ${minimum.toFixed(2)} required`);
    }
  }

  calculateDiscount(coupon, items, subtotal, restrictionSets) {
    const productIds = restrictionSets.productIds;
    const categoryIds = restrictionSets.categoryIds;
    const restricted = productIds.size > 0 || categoryIds.size > 0;

    let eligibleSubtotal = roundMoney(subtotal);
    if (restricted) {
      eligibleSubtotal = roundMoney(
        items.reduce((sum, item) => {
          const matchesProduct = productIds.has(Number(item.productId));
          const matchesCategory = item.categoryId && categoryIds.has(Number(item.categoryId));
          if (!matchesProduct && !matchesCategory) return sum;
          const lineTotal = item.totalPrice !== undefined
            ? Number(item.totalPrice)
            : Number(item.unitPrice) * Number(item.quantity);
          return sum + lineTotal;
        }, 0),
      );
    }

    if (restricted && eligibleSubtotal <= 0) {
      throw new ApiError(400, 'Coupon is not valid for the items in this cart');
    }

    let discount = 0;
    let freeShipping = false;

    if (coupon.type === 'percentage') {
      discount = eligibleSubtotal * (Number(coupon.value) / 100);
      if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined) {
        discount = Math.min(discount, Number(coupon.maxDiscountAmount));
      }
    } else if (coupon.type === 'fixed') {
      discount = Number(coupon.value);
    } else if (coupon.type === 'free_shipping') {
      freeShipping = true;
    }

    discount = roundMoney(Math.max(0, Math.min(discount, eligibleSubtotal)));

    return { discount, freeShipping, eligibleSubtotal };
  }

  async assertPerUserLimit(coupon, customer, transaction) {
    const perUserLimit = parseInt(coupon.perUserLimit, 10);
    if (!Number.isInteger(perUserLimit) || perUserLimit <= 0) return;

    const identities = [];
    if (customer && customer.userId) identities.push({ userId: customer.userId });
    if (customer && customer.phone) {
      identities.push({ guestPhone: this.normalizePhone(customer.phone) });
    }
    if (customer && customer.email) {
      identities.push({ email: { [Op.iLike]: String(customer.email).trim() } });
    }

    if (identities.length === 0) {
      throw new ApiError(400, 'A customer account or phone number is required for this coupon');
    }

    const used = await Order.count({
      where: {
        couponId: coupon.id,
        [Op.or]: identities,
      },
      transaction,
    });

    if (used >= perUserLimit) {
      throw new ApiError(400, 'You have already used this coupon');
    }
  }

  async applyToOrder({ code, adminId, items, subtotal, customer, transaction }) {
    if (!code || !String(code).trim()) {
      return { coupon: null, discount: 0, freeShipping: false, eligibleSubtotal: roundMoney(subtotal) };
    }
    if (!adminId) throw new ApiError(400, 'Unable to resolve the store for this coupon');

    const coupon = await Coupon.findOne({
      where: { code: this.normalizeCode(code), adminId },
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined,
    });
    if (!coupon) throw new ApiError(400, 'Invalid coupon code');

    this.validateState(coupon, subtotal);

    const restrictionSets = await this.loadRestrictionSets(coupon.id, transaction);
    const calculation = this.calculateDiscount(coupon, items, subtotal, restrictionSets);

    await this.assertPerUserLimit(coupon, customer || {}, transaction);

    return {
      coupon,
      discount: calculation.discount,
      freeShipping: calculation.freeShipping,
      eligibleSubtotal: calculation.eligibleSubtotal,
    };
  }

  async incrementUsage(coupon, transaction) {
    if (!coupon) return;
    await coupon.increment('usedCount', { by: 1, transaction });
  }

  async validateForCart(data) {
    const code = this.normalizeCode(data.code);
    if (!code) throw new ApiError(400, 'Coupon code is required');

    const rawItems = Array.isArray(data.items) ? data.items : [];
    if (rawItems.length === 0) throw new ApiError(400, 'Cart items are required');

    const productIds = Array.from(
      new Set(
        rawItems
          .map((item) => parseInt(item.productId, 10))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );
    if (productIds.length === 0) throw new ApiError(400, 'Cart items are required');

    const products = await Product.findAll({
      where: { id: { [Op.in]: productIds }, status: 'published' },
    });
    if (products.length !== productIds.length) {
      throw new ApiError(400, 'One or more products are not available');
    }

    const adminIds = Array.from(new Set(products.map((product) => product.adminId).filter(Boolean)));
    if (adminIds.length !== 1) {
      throw new ApiError(400, 'All items in an order must belong to the same store');
    }
    const adminId = adminIds[0];

    const productMap = {};
    products.forEach((product) => { productMap[product.id] = product; });

    let subtotal = 0;
    const lines = [];
    for (const item of rawItems) {
      const productId = parseInt(item.productId, 10);
      const quantity = parseInt(item.quantity, 10);
      const product = productMap[productId];
      if (!product) throw new ApiError(400, 'One or more products are not available');
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new ApiError(400, 'Invalid item quantity');
      }
      if (Number(product.quantity) < quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }

      const unitPrice = roundMoney(product.price);
      const totalPrice = roundMoney(unitPrice * quantity);
      subtotal += totalPrice;
      lines.push({
        productId,
        categoryId: product.categoryId,
        quantity,
        unitPrice,
        totalPrice,
      });
    }
    subtotal = roundMoney(subtotal);

    const coupon = await Coupon.findOne({
      where: { code, adminId, isActive: true },
      include: RESTRICTION_INCLUDE,
    });
    if (!coupon) throw new ApiError(400, 'Invalid coupon code');

    this.validateState(coupon, subtotal);

    const restrictionSets = {
      productIds: new Set((coupon.products || []).map((product) => Number(product.id))),
      categoryIds: new Set((coupon.categories || []).map((category) => Number(category.id))),
    };
    const calculation = this.calculateDiscount(coupon, lines, subtotal, restrictionSets);

    return {
      coupon: this.present(coupon, restrictionSets),
      discount: calculation.discount,
      freeShipping: calculation.freeShipping,
      subtotal,
      eligibleSubtotal: calculation.eligibleSubtotal,
    };
  }
}

module.exports = new CouponService();
