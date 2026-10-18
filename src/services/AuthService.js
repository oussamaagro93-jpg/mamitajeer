const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const userRepository = require('../repositories/UserRepository');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');
const { generateToken } = require('../utils/helpers');

class AuthService {
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
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new ApiError(400, 'Email already registered');
    }

    const user = await userRepository.create({
      ...data,
      emailVerificationToken: generateToken(),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const tokens = this.generateTokens(user.id, user.role);
    return { user, tokens };
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
    return { user, tokens };
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
    return user;
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

    return { resetToken, message: 'Password reset email sent' };
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
    return user;
  }

  async getProfile(userId) {
    return userRepository.findById(userId);
  }

  async updateProfile(userId, data) {
    const user = await userRepository.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    return user.update(data);
  }

  async updatePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new ApiError(400, 'Current password is incorrect');

    user.password = newPassword;
    await user.save();
    return user;
  }
}

module.exports = new AuthService();
