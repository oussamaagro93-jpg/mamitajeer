const guestCheckoutService = require('../services/GuestCheckoutService');
const { sendSuccess } = require('../utils/response');

class GuestCheckoutController {
  async checkout(req, res, next) {
    try {
      const order = await guestCheckoutService.checkout(req.body);
      sendSuccess(res, { order }, 'Order placed successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GuestCheckoutController();
