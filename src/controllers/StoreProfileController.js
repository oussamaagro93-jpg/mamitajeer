const storeProfileService = require('../services/StoreProfileService');
const { sendSuccess } = require('../utils/response');

class StoreProfileController {
  async show(req, res, next) {
    try {
      const store = await storeProfileService.get(req.tenantAdminId);
      sendSuccess(res, { store });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const store = await storeProfileService.update(req.body, req.tenantAdminId);
      sendSuccess(res, { store }, 'Store information saved');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StoreProfileController();
