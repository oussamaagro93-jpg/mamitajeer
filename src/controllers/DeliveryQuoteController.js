const { Op } = require('sequelize');
const wilayaService = require('../services/WilayaService');
const shippingRateService = require('../services/ShippingRateService');
const deliveryCompanyService = require('../services/DeliveryCompanyService');
const { Product } = require('../models');
const { sendSuccess } = require('../utils/response');

class DeliveryQuoteController {
  async getWilayas(req, res, next) {
    try {
      const wilayas = await wilayaService.getActive();
      sendSuccess(res, { wilayas });
    } catch (error) {
      next(error);
    }
  }

  async getCommunes(req, res, next) {
    try {
      const communes = await wilayaService.getCommunes(req.params.wilayaId);
      sendSuccess(res, { communes });
    } catch (error) {
      next(error);
    }
  }

  async getShippingOptions(req, res, next) {
    try {
      const { wilayaId, communeId, deliveryCompanyId, productIds } = req.query;
      if (!wilayaId) {
        return sendSuccess(res, { options: [] });
      }

      let assignedCompanyIds = null;
      if (productIds !== undefined && productIds !== null && productIds !== '') {
        const ids = (Array.isArray(productIds) ? productIds : String(productIds).split(','))
          .map(function (value) { return parseInt(value, 10); })
          .filter(function (value) { return Number.isInteger(value) && value > 0; });

        if (ids.length === 0) {
          assignedCompanyIds = [];
        } else {
          const products = await Product.findAll({
            where: {
              id: { [Op.in]: Array.from(new Set(ids)) },
              status: 'published',
            },
            attributes: ['id', 'deliveryCompanyId'],
            raw: true,
          });
          const companies = Array.from(new Set(
            products
              .map(function (product) { return parseInt(product.deliveryCompanyId, 10); })
              .filter(function (id) { return Number.isInteger(id) && id > 0; }),
          ));
          // No product has an assigned company: keep the legacy behaviour and
          // let the customer choose from all active companies.
          assignedCompanyIds = products.length > 0 && companies.length === 0 ? null : companies;
        }
      }

      const options = await shippingRateService.getAvailableOptions(
        wilayaId,
        communeId || null,
        deliveryCompanyId || null,
        null,
        assignedCompanyIds,
      );
      sendSuccess(res, { options });
    } catch (error) {
      next(error);
    }
  }

  async calculatePrice(req, res, next) {
    try {
      const { deliveryCompanyId, wilayaId, communeId, deliveryType } = req.body;
      const quote = await shippingRateService.calculatePrice(deliveryCompanyId, wilayaId, communeId || null, deliveryType);
      sendSuccess(res, { quote });
    } catch (error) {
      next(error);
    }
  }

  async getDeliveryCompanies(req, res, next) {
    try {
      const companies = await deliveryCompanyService.getActive();
      sendSuccess(res, { companies });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DeliveryQuoteController();
