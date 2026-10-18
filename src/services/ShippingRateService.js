const { ShippingRate, DeliveryCompany, Wilaya, CommuneShippingOverride, Commune } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta } = require('../utils/helpers');
const { Op } = require('sequelize');

class ShippingRateService {
  async findAll(query) {
    const { page, limit, offset } = paginate(query);
    const { deliveryCompanyId, wilayaId, search, active } = query;
    const where = {};
    if (deliveryCompanyId) where.deliveryCompanyId = deliveryCompanyId;
    if (wilayaId) where.wilayaId = wilayaId;
    if (active !== undefined) where.active = active === 'true' || active === true;

    const include = [
      { model: DeliveryCompany, as: 'deliveryCompany', attributes: ['id', 'name', 'code'] },
      { model: Wilaya, as: 'wilaya', attributes: ['id', 'code', 'nameAr', 'nameFr'] },
    ];

    if (search) {
      where[Op.or] = [
        { '$deliveryCompany.name$': { [Op.iLike]: `%${search}%` } },
        { '$wilaya.name_fr$': { [Op.iLike]: `%${search}%` } },
      ];
    }

    const result = await ShippingRate.findAndCountAll({
      where,
      include,
      limit,
      offset,
      order: [[{ model: Wilaya, as: 'wilaya' }, 'code', 'ASC']],
    });

    return { rates: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async findByCompanyId(companyId, query = {}) {
    const { page, limit, offset } = paginate(query);
    const where = { deliveryCompanyId: companyId };
    if (query.active !== undefined) where.active = query.active === 'true' || query.active === true;

    const result = await ShippingRate.findAndCountAll({
      where,
      include: [
        { model: Wilaya, as: 'wilaya', attributes: ['id', 'code', 'nameAr', 'nameFr'] },
      ],
      limit,
      offset,
      order: [[{ model: Wilaya, as: 'wilaya' }, 'code', 'ASC']],
    });

    return { rates: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async findById(id) {
    const rate = await ShippingRate.findByPk(id, {
      include: [
        { model: DeliveryCompany, as: 'deliveryCompany', attributes: ['id', 'name', 'code'] },
        { model: Wilaya, as: 'wilaya', attributes: ['id', 'code', 'nameAr', 'nameFr'] },
      ],
    });
    if (!rate) throw new ApiError(404, 'Shipping rate not found');
    return rate;
  }

  async create(data) {
    const existing = await ShippingRate.findOne({
      where: { deliveryCompanyId: data.deliveryCompanyId, wilayaId: data.wilayaId, active: true },
    });
    if (existing) throw new ApiError(400, 'An active rate already exists for this company and wilaya');
    return ShippingRate.create(data);
  }

  async update(id, data) {
    const rate = await ShippingRate.findByPk(id);
    if (!rate) throw new ApiError(404, 'Shipping rate not found');
    return rate.update(data);
  }

  async delete(id) {
    const rate = await ShippingRate.findByPk(id);
    if (!rate) throw new ApiError(404, 'Shipping rate not found');
    await rate.destroy();
    return true;
  }

  async bulkUpsert(rates) {
    const results = { created: 0, updated: 0, errors: [] };

    for (const rate of rates) {
      try {
        if (!rate.deliveryCompanyId || !rate.wilayaCode) {
          results.errors.push({ ...rate, error: 'deliveryCompanyId and wilayaCode are required' });
          continue;
        }

        const wilaya = await Wilaya.findOne({ where: { code: String(rate.wilayaCode) } });
        if (!wilaya) {
          results.errors.push({ ...rate, error: `Wilaya code ${rate.wilayaCode} does not exist.` });
          continue;
        }

        const wilayaId = wilaya.id;

        const [instance, created] = await ShippingRate.findOrCreate({
          where: {
            deliveryCompanyId: rate.deliveryCompanyId,
            wilayaId,
          },
          defaults: { ...rate, wilayaId, wilayaCode: undefined },
        });

        if (!created) {
          await instance.update({ ...rate, wilayaId, wilayaCode: undefined });
          results.updated++;
        } else {
          results.created++;
        }
      } catch (err) {
        results.errors.push({ ...rate, error: err.message });
      }
    }

    return results;
  }

  async calculatePrice(deliveryCompanyId, wilayaId, communeId, deliveryType) {
    const company = await DeliveryCompany.findByPk(deliveryCompanyId);
    if (!company || !company.active) throw new ApiError(400, 'Delivery company not found or inactive');

    const wilaya = await Wilaya.findByPk(wilayaId);
    if (!wilaya || !wilaya.active) throw new ApiError(400, 'Wilaya not found or inactive');

    const rate = await ShippingRate.findOne({
      where: { deliveryCompanyId, wilayaId, active: true },
    });

    if (!rate) throw new ApiError(400, 'No shipping rate found for this company and wilaya');

    if (communeId) {
      const override = await CommuneShippingOverride.findOne({
        where: { deliveryCompanyId, communeId, active: true },
      });

      if (override) {
        const price = deliveryType === 'home_delivery'
          ? (override.homeDeliveryPrice !== null ? override.homeDeliveryPrice : null)
          : (override.deskDeliveryPrice !== null ? override.deskDeliveryPrice : null);

        if (price !== null) {
          return {
            price: parseFloat(price),
            deliveryCompanyName: company.name,
            deliveryCompanyCode: company.code,
            deliveryType,
            wilayaName: wilaya.nameFr,
            estimatedDaysMin: rate.estimatedDeliveryDaysMin,
            estimatedDaysMax: rate.estimatedDeliveryDaysMax,
            source: 'commune_override',
          };
        }

        const available = deliveryType === 'home_delivery'
          ? override.homeDeliveryAvailable
          : override.deskDeliveryAvailable;

        if (available === false) throw new ApiError(400, `This delivery type is not available for this commune`);
      }
    }

    if (deliveryType === 'home_delivery' && !rate.homeDeliveryAvailable) {
      throw new ApiError(400, 'Home delivery not available for this destination');
    }
    if (deliveryType === 'desk_delivery' && !rate.deskDeliveryAvailable) {
      throw new ApiError(400, 'Desk delivery not available for this destination');
    }

    const price = deliveryType === 'home_delivery'
      ? parseFloat(rate.homeDeliveryPrice)
      : parseFloat(rate.deskDeliveryPrice);

    return {
      price,
      deliveryCompanyName: company.name,
      deliveryCompanyCode: company.code,
      deliveryType,
      wilayaName: wilaya.nameFr,
      estimatedDaysMin: rate.estimatedDeliveryDaysMin,
      estimatedDaysMax: rate.estimatedDeliveryDaysMax,
      source: 'wilaya_rate',
    };
  }

  async getAvailableOptions(wilayaId, communeId) {
    const wilaya = await Wilaya.findByPk(wilayaId);
    if (!wilaya || !wilaya.active) throw new ApiError(400, 'Wilaya not found or inactive');

    const companies = await DeliveryCompany.findAll({
      where: { active: true },
      order: [['name', 'ASC']],
    });

    const options = [];

    for (const company of companies) {
      const rate = await ShippingRate.findOne({
        where: { deliveryCompanyId: company.id, wilayaId, active: true },
      });

      if (!rate) continue;

      const option = {
        deliveryCompanyId: company.id,
        deliveryCompanyName: company.name,
        deliveryCompanyCode: company.code,
        methods: [],
      };

      let overrideHomePrice = null;
      let overrideDeskPrice = null;
      let overrideHomeAvailable = null;
      let overrideDeskAvailable = null;

      if (communeId) {
        const override = await CommuneShippingOverride.findOne({
          where: { deliveryCompanyId: company.id, communeId, active: true },
        });

        if (override) {
          overrideHomePrice = override.homeDeliveryPrice !== null ? parseFloat(override.homeDeliveryPrice) : null;
          overrideDeskPrice = override.deskDeliveryPrice !== null ? parseFloat(override.deskDeliveryPrice) : null;
          overrideHomeAvailable = override.homeDeliveryAvailable;
          overrideDeskAvailable = override.deskDeliveryAvailable;
        }
      }

      const homeAvailable = overrideHomeAvailable !== null ? overrideHomeAvailable : rate.homeDeliveryAvailable;
      const deskAvailable = overrideDeskAvailable !== null ? overrideDeskAvailable : rate.deskDeliveryAvailable;

      if (homeAvailable) {
        option.methods.push({
          type: 'home_delivery',
          label: 'Home Delivery',
          price: overrideHomePrice !== null ? overrideHomePrice : parseFloat(rate.homeDeliveryPrice),
          estimatedDaysMin: rate.estimatedDeliveryDaysMin,
          estimatedDaysMax: rate.estimatedDeliveryDaysMax,
        });
      }

      if (deskAvailable) {
        option.methods.push({
          type: 'desk_delivery',
          label: 'Stop Desk',
          price: overrideDeskPrice !== null ? overrideDeskPrice : parseFloat(rate.deskDeliveryPrice),
          estimatedDaysMin: rate.estimatedDeliveryDaysMin,
          estimatedDaysMax: rate.estimatedDeliveryDaysMax,
        });
      }

      if (option.methods.length > 0) {
        options.push(option);
      }
    }

    return options;
  }
}

module.exports = new ShippingRateService();
