const { Order, Product, User, Review, Inventory } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

class DashboardService {
  async getCloudinaryStats() {
    const cloudinary = require('../config/cloudinary');

    const result = await cloudinary.api.usage();

    const formatBytes = (bytes, decimals = 2) => {
      if (!bytes || bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    };

    const totalImages = result.resources || result.objects?.usage || 0;
    const storageUsedBytes = result.storage?.usage || 0;
    const storageLimitBytes = result.storage?.limit || 0;
    const bandwidthUsedBytes = result.bandwidth?.usage || 0;
    const bandwidthLimitBytes = result.bandwidth?.limit || 0;
    const storageUsedPercent = result.storage?.used_percent;
    const bandwidthUsedPercent = result.bandwidth?.used_percent;

    return {
      plan: result.plan || 'Unknown',
      totalImages,
      storageUsed: storageUsedBytes,
      storageUsedFormatted: formatBytes(storageUsedBytes),
      storageLimit: storageLimitBytes,
      storageLimitFormatted: storageLimitBytes > 0 ? formatBytes(storageLimitBytes) : 'N/A',
      storageUsedPercent: storageUsedPercent != null ? parseFloat(storageUsedPercent.toFixed(2)) : null,
      storageRemainingFormatted: storageLimitBytes > 0 ? formatBytes(Math.max(0, storageLimitBytes - storageUsedBytes)) : 'N/A',
      bandwidthUsed: bandwidthUsedBytes,
      bandwidthUsedFormatted: formatBytes(bandwidthUsedBytes),
      bandwidthLimit: bandwidthLimitBytes,
      bandwidthLimitFormatted: bandwidthLimitBytes > 0 ? formatBytes(bandwidthLimitBytes) : 'N/A',
      bandwidthUsedPercent: bandwidthUsedPercent != null ? parseFloat(bandwidthUsedPercent.toFixed(2)) : null,
      lastUpdated: result.last_updated || null,
    };
  }

  async getStats(tenantId) {
    const orderWhere = tenantId ? { adminId: tenantId } : {};
    const productWhere = tenantId ? { adminId: tenantId } : {};
    const customerWhere = tenantId ? { adminId: tenantId, role: 'customer' } : { role: 'customer' };

    const totalRevenue = await Order.sum('total', { where: { ...orderWhere, status: { [Op.notIn]: ['cancelled', 'refunded'] } } }) || 0;
    const totalOrders = await Order.count({ where: orderWhere });
    const totalCustomers = await User.count({ where: customerWhere });
    const totalProducts = await Product.count({ where: { ...productWhere, status: 'published' } });
    const pendingOrders = await Order.count({ where: { ...orderWhere, status: 'pending' } });
    const lowStockProducts = await Product.count({ where: { ...productWhere, quantity: { [Op.lte]: literal('low_stock_threshold') } } });
    const totalReviews = tenantId
      ? await Review.count({
          include: [{ model: Product, as: 'product', where: { adminId: tenantId }, required: true }],
        })
      : await Review.count();
    const totalRevenueToday = await Order.sum('total', { where: { ...orderWhere, createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) }, status: { [Op.notIn]: ['cancelled', 'refunded'] } } }) || 0;

    const recentOrders = await Order.findAll({
      where: orderWhere,
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }],
    });

    const topProducts = await Product.findAll({
      limit: 10,
      order: [['quantity', 'DESC']],
      where: { ...productWhere, status: 'published' },
    });

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalProducts,
      pendingOrders,
      lowStockProducts,
      totalReviews,
      totalRevenueToday,
      recentOrders,
      topProducts,
    };
  }

  async getRevenueChart(days = 30, tenantId) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = await Order.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('SUM', col('total')), 'revenue'],
        [fn('COUNT', col('id')), 'orders'],
      ],
      where: {
        ...(tenantId ? { adminId: tenantId } : {}),
        createdAt: { [Op.gte]: startDate },
        status: { [Op.notIn]: ['cancelled', 'refunded'] },
      },
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      raw: true,
    });

    return data;
  }

  async getOrderStatusDistribution(tenantId) {
    const data = await Order.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      where: tenantId ? { adminId: tenantId } : {},
      group: ['status'],
      raw: true,
    });
    return data;
  }
}

module.exports = new DashboardService();
