const dashboardService = require('../services/DashboardService');
const { sendSuccess } = require('../utils/response');

class DashboardController {
  async stats(req, res, next) {
    try {
      const data = await dashboardService.getStats();
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async revenueChart(req, res, next) {
    try {
      const days = parseInt(req.query.days) || 30;
      const data = await dashboardService.getRevenueChart(days);
      sendSuccess(res, { data });
    } catch (error) {
      next(error);
    }
  }

  async orderStatusDistribution(req, res, next) {
    try {
      const data = await dashboardService.getOrderStatusDistribution();
      sendSuccess(res, { data });
    } catch (error) {
      next(error);
    }
  }

  async cloudinaryStats(req, res, next) {
    try {
      const data = await dashboardService.getCloudinaryStats();
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
