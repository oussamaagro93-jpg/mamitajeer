const authService = require('../services/AuthService');
const { sendSuccess } = require('../utils/response');

class AuthController {
  async register(req, res, next) {
    try {
      const { user, tokens } = await authService.register(req.body);
      sendSuccess(res, { user, tokens }, 'Registration successful', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, tokens } = await authService.login(email, password);
      sendSuccess(res, { user, tokens }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshAccessToken(refreshToken);
      sendSuccess(res, { tokens }, 'Token refreshed');
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req, res, next) {
    try {
      const user = await authService.verifyEmail(req.params.token);
      sendSuccess(res, { user }, 'Email verified successfully');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await authService.forgotPassword(req.body.email);
      sendSuccess(res, result, 'Password reset email sent');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const user = await authService.resetPassword(req.params.token, req.body.password);
      sendSuccess(res, { user }, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await authService.getProfile(req.userId);
      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const user = await authService.updateProfile(req.userId, req.body);
      sendSuccess(res, { user }, 'Profile updated');
    } catch (error) {
      next(error);
    }
  }

  async updatePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.updatePassword(req.userId, currentPassword, newPassword);
      sendSuccess(res, null, 'Password updated');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
