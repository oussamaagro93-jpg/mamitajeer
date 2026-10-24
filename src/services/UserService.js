const { User } = require('../models');
const { Op } = require('sequelize');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta } = require('../utils/helpers');
const {
  EMPLOYEE_PERMISSIONS,
  MANAGER_ASSIGNABLE_PERMISSIONS,
  sanitizePermissions,
} = require('../config/permissions');
const { resolveAdminId } = require('../utils/tenant');

const TEAM_ROLES = ['manager', 'employee'];

class UserService {
  tenantOf(actor) {
    if (!actor) return null;
    if (actor.role === 'super_admin') return null;
    if (actor.role === 'admin') return actor.id;
    return actor.adminId || null;
  }

  isSuperAdmin(actor) {
    return actor && actor.role === 'super_admin';
  }

  canManageRole(actor, role) {
    if (this.isSuperAdmin(actor)) return role !== 'super_admin';
    if (actor.role === 'admin') return TEAM_ROLES.indexOf(role) !== -1;
    if (actor.role === 'manager') return role === 'employee';
    return false;
  }

  async findScopedUser(id, actor) {
    const tenantId = this.tenantOf(actor);
    const where = { id };
    if (!this.isSuperAdmin(actor)) {
      if (actor.role === 'admin') {
        // An admin's own row has adminId = null, so include it explicitly.
        where[Op.or] = [{ adminId: tenantId }, { id: actor.id }];
      } else {
        where.adminId = tenantId;
      }
    }

    const user = await User.findOne({ where });
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role === 'super_admin' && !this.isSuperAdmin(actor)) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  }

  async findAll(query, actor) {
    const { page, limit, offset } = paginate(query);
    const { search, role, isActive } = query;
    const where = {};

    if (this.isSuperAdmin(actor)) {
      if (query.adminId) where.adminId = query.adminId;
    } else if (actor.role === 'admin') {
      where.adminId = actor.id;
    } else if (actor.role === 'manager') {
      where.adminId = actor.adminId;
      where.role = 'employee';
    } else {
      throw new ApiError(403, 'Insufficient permissions');
    }

    // Never expose superadmin accounts through team management.
    if (this.isSuperAdmin(actor)) {
      // The staff management screen should not list customers; those belong
      // to the dedicated Customers module.
      where.role = { [Op.in]: ['admin'].concat(TEAM_ROLES) };
    } else if (!where.role) {
      where.role = { [Op.in]: TEAM_ROLES };
    }

    if (role) {
      if (!this.canManageRole(actor, role) && !(actor.role === 'admin' && role === 'employee')) {
        throw new ApiError(403, 'You cannot list this role');
      }
      where.role = role;
    }
    if (isActive !== undefined) where.isActive = isActive === 'true';

    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const result = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
    return { users: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async findById(id, actor) {
    return this.findScopedUser(id, actor);
  }

  async create(data, actor) {
    if (!data || !data.firstName || !data.lastName || !data.email || !data.password) {
      throw new ApiError(400, 'First name, last name, email and password are required');
    }
    if (String(data.password).length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters');
    }

    const role = data.role || 'employee';
    if (!this.canManageRole(actor, role)) {
      throw new ApiError(403, 'You cannot create a user with this role');
    }

    const existing = await User.findOne({ where: { email: data.email }, paranoid: false });
    if (existing) throw new ApiError(400, 'Email already in use');

    let adminId = null;
    if (role === 'admin') {
      if (!this.isSuperAdmin(actor)) throw new ApiError(403, 'Only a superadmin can create admins');
    } else {
      adminId = await resolveAdminId(this.tenantOf(actor) || data.adminId);
      if (!adminId) throw new ApiError(400, 'An admin account is required for this user');
    }

    let permissions = [];
    if (role === 'manager') {
      permissions = sanitizePermissions(data.permissions).filter(function (permission) {
        return MANAGER_ASSIGNABLE_PERMISSIONS.indexOf(permission) !== -1;
      });
    } else if (role === 'employee') {
      permissions = EMPLOYEE_PERMISSIONS.slice();
    }

    return User.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      phone: data.phone || null,
      role,
      adminId,
      permissions,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isEmailVerified: true,
    });
  }

  async update(id, data, actor) {
    const user = await this.findScopedUser(id, actor);

    if (user.role === 'super_admin') {
      throw new ApiError(403, 'Superadmin accounts cannot be modified here');
    }
    if (!this.canManageRole(actor, user.role)) {
      throw new ApiError(403, 'You cannot manage this user');
    }

    const updates = {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      isActive: data.isActive,
    };
    Object.keys(updates).forEach(function (key) {
      if (updates[key] === undefined) delete updates[key];
    });

    if (data.password && String(data.password).length >= 6) {
      updates.password = data.password;
    }

    // Role changes: only superadmin may promote/demote outside their team.
    if (data.role && data.role !== user.role) {
      if (!this.isSuperAdmin(actor)) {
        if (actor.role === 'admin' && TEAM_ROLES.indexOf(data.role) === -1) {
          throw new ApiError(403, 'You can only assign manager or employee roles');
        }
        if (actor.role === 'manager') {
          throw new ApiError(403, 'Managers cannot change roles');
        }
      }
      if (!this.canManageRole(actor, data.role)) {
        throw new ApiError(403, 'You cannot assign this role');
      }
      updates.role = data.role;
      if (data.role === 'employee') {
        updates.permissions = EMPLOYEE_PERMISSIONS.slice();
      } else if (data.role === 'manager') {
        updates.permissions = [];
      }
    }

    // Managers can never change permissions. Admins can assign manager
    // permissions; employees always stay read-only.
    if (updates.role === 'manager' || user.role === 'manager') {
      if (actor.role === 'manager') {
        if (data.permissions !== undefined) {
          throw new ApiError(403, 'Managers cannot change permissions');
        }
      } else if (actor.role === 'admin' || this.isSuperAdmin(actor)) {
        if (data.permissions !== undefined) {
          updates.permissions = sanitizePermissions(data.permissions);
        }
      }
    }

    if (updates.role === 'employee' || user.role === 'employee') {
      updates.permissions = EMPLOYEE_PERMISSIONS.slice();
    }

    if (this.isSuperAdmin(actor) && data.adminId !== undefined) {
      if (data.adminId) {
        const admin = await User.findOne({ where: { id: data.adminId, role: 'admin' } });
        if (!admin) throw new ApiError(400, 'Invalid admin account');
      }
      updates.adminId = data.adminId || null;
    }

    if (updates.role === 'admin') updates.adminId = null;

    await user.update(updates);
    return user;
  }

  async delete(id, actor) {
    const user = await this.findScopedUser(id, actor);

    if (user.id === actor.id) throw new ApiError(400, 'You cannot delete your own account');
    if (user.role === 'super_admin') throw new ApiError(403, 'Superadmin accounts cannot be deleted');
    if (!this.canManageRole(actor, user.role)) {
      throw new ApiError(403, 'You cannot delete this user');
    }

    await user.destroy();
    return true;
  }
}

module.exports = new UserService();
