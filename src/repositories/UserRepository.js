const BaseRepository = require('./BaseRepository');
const { User } = require('../models');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    return this.model.scope('withPassword').findOne({ where: { email } });
  }

  async findByResetToken(token) {
    return this.findOne({ where: { resetPasswordToken: token, resetPasswordExpires: { [this.model.sequelize.Sequelize.Op.gt]: new Date() } } });
  }

  async findByVerificationToken(token) {
    return this.findOne({ where: { emailVerificationToken: token, emailVerificationExpires: { [this.model.sequelize.Sequelize.Op.gt]: new Date() } } });
  }
}

module.exports = new UserRepository();
