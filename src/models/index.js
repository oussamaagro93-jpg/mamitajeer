const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const config = require('../config/database');

// Serverless bundlers (Vercel's @vercel/nft) cannot trace Sequelize's dynamic
// dialect loading, so the Postgres driver gets pruned from the function bundle.
// Requiring them explicitly keeps `pg` / `pg-hstore` in the deployment.
require('pg');
require('pg-hstore');

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];
const db = {};

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig,
);

fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1,
  )
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
