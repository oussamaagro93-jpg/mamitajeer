const metaService = require('../services/MetaService');
const { sendSuccess } = require('../utils/response');

class MetaController {
  async sendEvent(req, res, next) {
    try {
      var payload = req.body;
      if (!payload.meta_browser_data) {
        payload.meta_browser_data = {};
      }
      if (!payload.meta_browser_data.client_ip_address) {
        payload.meta_browser_data.client_ip_address = req.ip || req.connection.remoteAddress;
      }
      if (!payload.meta_browser_data.client_user_agent) {
        payload.meta_browser_data.client_user_agent = req.headers['user-agent'] || '';
      }
      var result = await metaService.sendEvent(payload);
      sendSuccess(res, result, 'Event sent');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MetaController();
