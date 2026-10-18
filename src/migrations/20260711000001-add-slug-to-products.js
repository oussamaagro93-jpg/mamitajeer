'use strict';

const slugify = require('slugify');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('products')) {
      return;
    }

    const tableInfo = await queryInterface.describeTable('products');

    if (!tableInfo.slug) {
      await queryInterface.addColumn('products', 'slug', {
        type: Sequelize.STRING(300),
        allowNull: true,
        unique: false,
      });

      const products = await queryInterface.sequelize.query(
        'SELECT id, name FROM products WHERE slug IS NULL OR slug = \'\'',
        { type: Sequelize.QueryTypes.SELECT },
      );

      for (const product of products) {
        let baseSlug = slugify(product.name, { lower: true, strict: true });
        let slug = baseSlug;
        let counter = 1;

        while (true) {
          const existing = await queryInterface.sequelize.query(
            'SELECT id FROM products WHERE slug = :slug AND id != :id',
            { replacements: { slug, id: product.id }, type: Sequelize.QueryTypes.SELECT },
          );
          if (existing.length === 0) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        await queryInterface.sequelize.query(
          'UPDATE products SET slug = :slug WHERE id = :id',
          { replacements: { slug, id: product.id } },
        );
      }

      await queryInterface.changeColumn('products', 'slug', {
        type: Sequelize.STRING(300),
        allowNull: false,
        unique: true,
      });

      await queryInterface.addIndex('products', ['slug'], {
        name: 'products_slug_unique',
        unique: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('products', 'products_slug_unique');
    await queryInterface.removeColumn('products', 'slug');
  },
};
