const { ShippingZone, ShippingMethod } = require('../models');
const ApiError = require('../utils/ApiError');

class ShippingService {
  async calculateShipping(wilaya, productWeight = 0, productPrice = 0) {
    const zone = await ShippingZone.findOne({
      where: { isActive: true },
      include: [
        { model: ShippingMethod, as: 'methods', where: { isActive: true }, required: false },
      ],
    });

    if (!zone) {
      return { cost: 0, methodName: 'Standard', estimatedDays: null };
    }

    let matchedMethod = null;
    const methods = zone.methods || [];

    for (const method of methods) {
      if (method.type === 'flat') {
        matchedMethod = method;
        break;
      }
      if (method.type === 'free' && productPrice >= (method.minPrice || Infinity)) {
        matchedMethod = method;
        break;
      }
      if (method.type === 'weight_based') {
        const minW = parseFloat(method.minWeight || 0);
        const maxW = parseFloat(method.maxWeight || Infinity);
        if (productWeight >= minW && productWeight <= maxW) {
          matchedMethod = method;
          break;
        }
      }
      if (method.type === 'price_based') {
        const minP = parseFloat(method.minPrice || 0);
        const maxP = parseFloat(method.maxPrice || Infinity);
        if (productPrice >= minP && productPrice <= maxP) {
          matchedMethod = method;
          break;
        }
      }
    }

    if (matchedMethod) {
      return {
        cost: parseFloat(matchedMethod.cost) || 0,
        methodName: matchedMethod.name,
        estimatedDays: matchedMethod.estimatedDays,
      };
    }

    const defaultMethod = methods.find(function (m) { return m.type === 'flat'; });
    if (defaultMethod) {
      return {
        cost: parseFloat(defaultMethod.cost) || 0,
        methodName: defaultMethod.name,
        estimatedDays: defaultMethod.estimatedDays,
      };
    }

    return { cost: 0, methodName: 'Standard', estimatedDays: null };
  }
}

module.exports = new ShippingService();
