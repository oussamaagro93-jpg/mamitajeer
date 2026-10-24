const ApiError = require('../utils/ApiError');

// Payment integration is intentionally isolated behind this service. Cash on
// delivery is fully supported today; additional providers can be added here
// without changing order calculation or checkout code.
const SUPPORTED_METHODS = ['cod', 'cash_on_delivery'];

class PaymentService {
  normalizeMethod(method) {
    const value = String(method || 'cod').toLowerCase();
    return value === 'cash_on_delivery' ? 'cod' : value;
  }

  assertSupported(method) {
    const normalized = this.normalizeMethod(method);
    if (SUPPORTED_METHODS.indexOf(normalized) === -1) {
      throw new ApiError(400, 'Unsupported payment method');
    }
    return normalized;
  }

  createPayment({ method, amount }) {
    const normalized = this.assertSupported(method);
    return {
      method: normalized,
      amount,
      status: 'pending',
      reference: null,
      redirectUrl: null,
    };
  }
}

module.exports = new PaymentService();
