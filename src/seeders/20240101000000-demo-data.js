const bcrypt = require('bcryptjs');
const { sequelize } = require('../models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await sequelize.sync();

    const now = new Date();
    const passwordHash = await bcrypt.hash('password123', 12);

    // Users
    const users = [
      { first_name: 'Super', last_name: 'Admin', email: 'super@store4.com', password: passwordHash, role: 'super_admin', is_active: true, is_email_verified: true, created_at: now, updated_at: now },
      { first_name: 'Store', last_name: 'Admin', email: 'admin@store4.com', password: passwordHash, role: 'admin', is_active: true, is_email_verified: true, created_at: now, updated_at: now },
      { first_name: 'John', last_name: 'Manager', email: 'manager@store4.com', password: passwordHash, role: 'manager', is_active: true, is_email_verified: true, created_at: now, updated_at: now },
      { first_name: 'Jane', last_name: 'Employee', email: 'employee@store4.com', password: passwordHash, role: 'employee', is_active: true, is_email_verified: true, created_at: now, updated_at: now },
      { first_name: 'Bob', last_name: 'Customer', email: 'customer@store4.com', password: passwordHash, role: 'customer', is_active: true, is_email_verified: true, created_at: now, updated_at: now },
    ];

    await queryInterface.bulkInsert('users', users);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  },
};
