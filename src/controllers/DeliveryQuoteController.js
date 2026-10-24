const wilayaService = require('../services/WilayaService');
const shippingRateService = require('../services/ShippingRateService');
const deliveryCompanyService = require('../services/DeliveryCompanyService');
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
      const { wilayaId, communeId, deliveryCompanyId } = req.query;
      if (!wilayaId) {
        return sendSuccess(res, { options: [] });
      }
      const options = await shippingRateService.getAvailableOptions(
        wilayaId,
        communeId || null,
        deliveryCompanyId || null,
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
