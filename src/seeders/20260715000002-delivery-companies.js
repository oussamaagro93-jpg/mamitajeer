'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    const existing = await queryInterface.sequelize.query(
      'SELECT code FROM delivery_companies',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingCodes = new Set(existing.map(c => c.code));

    const companies = [
      {
        name: 'Yalidine',
        code: 'yalidine',
        phone: null,
        website: 'https://yalidine.dz',
        contact_person: null,
        active: true,
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Anderson',
        code: 'anderson',
        phone: null,
        website: null,
        contact_person: null,
        active: true,
        created_at: now,
        updated_at: now,
      },
    ];

    const toInsert = companies.filter(c => !existingCodes.has(c.code));

    if (toInsert.length > 0) {
      await queryInterface.bulkInsert('delivery_companies', toInsert);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('delivery_companies', null, {});
  },
};
