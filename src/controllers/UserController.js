const userService = require('../services/UserService');
const { sendSuccess } = require('../utils/response');

class UserController {
  async index(req, res, next) {
    try {
      const data = await userService.findAll(req.query);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const user = await userService.findById(req.params.id);
      sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const user = await userService.create(req.body);
      sendSuccess(res, { user }, 'User created', 201);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const user = await userService.update(req.params.id, req.body);
      sendSuccess(res, { user }, 'User updated');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await userService.delete(req.params.id);
      sendSuccess(res, null, 'User deleted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
