'use strict';
const wilayasData = require('../data/wilayas.json');
const communesData = require('../data/communes.json');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // Check existing wilayas to avoid duplicates
    const existingWilayas = await queryInterface.sequelize.query(
      'SELECT code FROM wilayas',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingCodes = new Set(existingWilayas.map(w => w.code));

    const wilayaRows = [];

    for (const w of wilayasData) {
      if (existingCodes.has(w.code)) {
        continue;
      }
      wilayaRows.push({
        code: w.code,
        name_ar: w.name_ar,
        name_fr: w.name_fr,
        active: true,
        created_at: now,
        updated_at: now,
      });
    }

    if (wilayaRows.length > 0) {
      await queryInterface.bulkInsert('wilayas', wilayaRows);
    }

    // Now insert communes
    const existingCommunes = await queryInterface.sequelize.query(
      'SELECT id, wilaya_id, name_fr FROM communes',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingCommuneKeys = new Set(existingCommunes.map(c => `${c.wilaya_id}-${c.name_fr}`));

    // Get all wilaya IDs
    const allWilayas = await queryInterface.sequelize.query(
      'SELECT id, code FROM wilayas',
      { type: Sequelize.QueryTypes.SELECT }
    );
    const codeToId = {};
    for (const w of allWilayas) {
      codeToId[w.code] = w.id;
    }

    const communeRows = [];
    for (const c of communesData) {
      const wilayaId = codeToId[c.wilaya_code];
      if (!wilayaId) continue;

      const key = `${wilayaId}-${c.name_fr}`;
      if (existingCommuneKeys.has(key)) continue;

      communeRows.push({
        wilaya_id: wilayaId,
        name_ar: c.name_ar,
        name_fr: c.name_fr,
        active: true,
        created_at: now,
        updated_at: now,
      });
    }

    if (communeRows.length > 0) {
      await queryInterface.bulkInsert('communes', communeRows);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('communes', null, {});
    await queryInterface.bulkDelete('wilayas', null, {});
  },
};
