const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const userRepository = require('../repositories/UserRepository');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const { generateToken } = require('../utils/helpers');
const { getPermissionsForUser } = require('../config/permissions');
const emailService = require('./EmailService');
const logger = require('../utils/logger');

class AuthService {
  // Adds the effective permission list (role defaults included) so clients can
  // gate their UI without duplicating the role rules.
  serializeUser(user) {
    if (!user) return user;
    const raw = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    // Never leak verification/reset/refresh tokens to the client.
    const fields = [
      'id', 'firstName', 'lastName', 'email', 'phone', 'avatar', 'role',
      'adminId', 'isActive', 'isEmailVerified', 'lastLogin', 'createdAt',
      'updatedAt',
    ];
    const data = {};
    fields.forEach(function (field) {
      if (raw[field] !== undefined) data[field] = raw[field];
    });
    data.permissions = getPermissionsForUser(user);
    return data;
  }

  generateTokens(userId, role) {
    const accessToken = jwt.sign({ id: userId, role }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
    const refreshToken = jwt.sign({ id: userId, type: 'refresh' }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
    return { accessToken, refreshToken };
  }

  async register(data) {
    // Include soft-deleted users: their email is still protected by the
    // database unique index even though the row is hidden from normal queries.
    const existing = await userRepository.findByEmailIncludingDeleted(data.email);

    if (existing) {
      throw new ApiError(400, 'Email already registered');
    }

    // Public signup always creates an independent ADMIN account. The role is
    // assigned here on the server, never from the request payload.
    const user = await userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      phone: data.phone || null,
      avatar: null,
      role: 'admin',
      adminId: null,
      permissions: [],
      isActive: true,
      isEmailVerified: false,
      emailVerificationToken: generateToken(),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const tokens = this.generateTokens(user.id, user.role);
    return { user: this.serializeUser(user), tokens };
  }

  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'Account is deactivated');
    }

    await user.update({ lastLogin: new Date() });

    const tokens = this.generateTokens(user.id, user.role);
    return { user: this.serializeUser(user), tokens };
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      const user = await userRepository.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new ApiError(401, 'Invalid refresh token');
      }
      return this.generateTokens(user.id, user.role);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(401, 'Invalid or expired refresh token');
    }
  }

  async verifyEmail(token) {
    const user = await userRepository.findByVerificationToken(token);
    if (!user) {
      throw new ApiError(400, 'Invalid or expired verification token');
    }
    await user.update({
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });
    return this.serializeUser(user);
  }

  async forgotPassword(email) {
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await user.update({
      resetPasswordToken: resetToken,
      resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000),
    });

    try {
      await emailService.sendPasswordReset(user.email, resetToken);
    } catch (error) {
      logger.error('Failed to send password reset email: ' + error.message);
    }

    // The reset token must never be exposed in production. Development
    // returns it so the flow can be tested without a configured mail server.
    const result = { message: 'If the email exists, a reset link has been sent' };
    if (config.env !== 'production') result.resetToken = resetToken;
    return result;
  }

  async resetPassword(token, newPassword) {
    const user = await userRepository.findByResetToken(token);
    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }
    user.password = newPassword;
    await user.save();
    await user.update({
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
    return this.serializeUser(user);
  }

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    return this.serializeUser(user);
  }

  async updateProfile(userId, data) {
    const user = await userRepository.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    // Never allow role, tenant or permission changes through the self-service
    // profile endpoint.
    const allowed = ['firstName', 'lastName', 'phone', 'avatar'];
    const updates = {};
    allowed.forEach(function (field) {
      if (data[field] !== undefined) updates[field] = data[field];
    });

    await user.update(updates);
    return this.serializeUser(user);
  }

  async updatePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw new ApiError(404, 'User not found');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new ApiError(400, 'Current password is incorrect');

    user.password = newPassword;
    await user.save();
    return user;
  }
}

module.exports = new AuthService();
