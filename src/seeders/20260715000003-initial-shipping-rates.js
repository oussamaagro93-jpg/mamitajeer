'use strict';
const yalidinePrices = require('../data/delivery-prices/yalidine.json');
const andersonPrices = require('../data/delivery-prices/anderson.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // Get delivery companies
    const companies = await queryInterface.sequelize.query(
      'SELECT id, code FROM delivery_companies WHERE active = true',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const companyMap = {};
    for (const c of companies) {
      companyMap[c.code] = c.id;
    }

    // Get wilayas
    const wilayas = await queryInterface.sequelize.query(
      'SELECT id, code FROM wilayas',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const wilayaMap = {};
    for (const w of wilayas) {
      wilayaMap[w.code] = w.id;
    }

    // Get existing rates to avoid duplicates
    const existingRates = await queryInterface.sequelize.query(
      'SELECT delivery_company_id, wilaya_id FROM shipping_rates',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingRateKeys = new Set(
      existingRates.map(r => `${r.delivery_company_id}-${r.wilaya_id}`)
    );

    const rates = [];

    const insertPrices = (priceData, companyCode) => {
      const companyId = companyMap[companyCode];
      if (!companyId) return;

      for (const p of priceData) {
        const wilayaId = wilayaMap[p.wilaya_code];
        if (!wilayaId) continue;

        const key = `${companyId}-${wilayaId}`;
        if (existingRateKeys.has(key)) continue;

        rates.push({
          delivery_company_id: companyId,
          wilaya_id: wilayaId,
          home_delivery_price: p.home_delivery_price,
          desk_delivery_price: p.desk_delivery_price,
          home_delivery_available: p.home_delivery_available !== false,
          desk_delivery_available: p.desk_delivery_available !== false,
          estimated_delivery_days_min: p.estimated_delivery_days_min || null,
          estimated_delivery_days_max: p.estimated_delivery_days_max || null,
          active: true,
          created_at: now,
          updated_at: now,
        });
      }
    };

    insertPrices(yalidinePrices, 'yalidine');
    insertPrices(andersonPrices, 'anderson');

    if (rates.length > 0) {
      await queryInterface.bulkInsert('shipping_rates', rates);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('shipping_rates', null, {});
  },
};
