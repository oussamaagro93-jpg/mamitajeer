// Central permission catalogue. Keep identifiers stable: they are stored in
// users.permissions for managers and are also used by the frontend.
const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',

  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',

  CATEGORIES_VIEW: 'categories.view',
  CATEGORIES_CREATE: 'categories.create',
  CATEGORIES_UPDATE: 'categories.update',
  CATEGORIES_DELETE: 'categories.delete',

  BRANDS_VIEW: 'brands.view',
  BRANDS_CREATE: 'brands.create',
  BRANDS_UPDATE: 'brands.update',
  BRANDS_DELETE: 'brands.delete',

  ORDERS_VIEW: 'orders.view',
  ORDERS_CREATE: 'orders.create',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_DELETE: 'orders.delete',

  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_UPDATE: 'customers.update',
  CUSTOMERS_DELETE: 'customers.delete',

  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_CREATE: 'inventory.create',
  INVENTORY_UPDATE: 'inventory.update',
  INVENTORY_DELETE: 'inventory.delete',

  COUPONS_VIEW: 'coupons.view',
  COUPONS_CREATE: 'coupons.create',
  COUPONS_UPDATE: 'coupons.update',
  COUPONS_DELETE: 'coupons.delete',

  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  SHIPPING_VIEW: 'shipping.view',
  SHIPPING_CREATE: 'shipping.create',
  SHIPPING_UPDATE: 'shipping.update',
  SHIPPING_DELETE: 'shipping.delete',

  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',
};

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// Admins own a tenant and can use every tenant-scoped module.
const ADMIN_PERMISSIONS = ALL_PERMISSIONS.slice();

// Employees have a fixed read-only permission set. Their permissions are
// derived from the role and are never editable.
const EMPLOYEE_PERMISSIONS = [
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.CATEGORIES_VIEW,
  PERMISSIONS.BRANDS_VIEW,
  PERMISSIONS.ORDERS_VIEW,
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.COUPONS_VIEW,
];

// Permissions an admin may grant to a manager.
const MANAGER_ASSIGNABLE_PERMISSIONS = ALL_PERMISSIONS.slice();

const STAFF_ROLES = ['super_admin', 'admin', 'manager', 'employee'];

function isValidPermission(permission) {
  return ALL_PERMISSIONS.indexOf(permission) !== -1;
}

function sanitizePermissions(permissions) {
  if (!Array.isArray(permissions)) return [];
  return permissions.filter(function (permission, index) {
    return isValidPermission(permission) && permissions.indexOf(permission) === index;
  });
}

function getPermissionsForUser(user) {
  if (!user) return [];
  if (user.role === 'super_admin') return ALL_PERMISSIONS.slice();
  if (user.role === 'admin') return ADMIN_PERMISSIONS.slice();
  if (user.role === 'manager') return sanitizePermissions(user.permissions);
  if (user.role === 'employee') return EMPLOYEE_PERMISSIONS.slice();
  return [];
}

function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  var permissions = getPermissionsForUser(user);
  return permissions.indexOf(permission) !== -1;
}

// Returns the admin user id that owns the current user's data.
// super_admin has no tenant (null means "all tenants" for reads).
function getTenantAdminId(user) {
  if (!user) return null;
  if (user.role === 'super_admin') return null;
  if (user.role === 'admin') return user.id;
  return user.adminId || null;
}

module.exports = {
  PERMISSIONS,
  ALL_PERMISSIONS,
  ADMIN_PERMISSIONS,
  EMPLOYEE_PERMISSIONS,
  MANAGER_ASSIGNABLE_PERMISSIONS,
  STAFF_ROLES,
  isValidPermission,
  sanitizePermissions,
  getPermissionsForUser,
  hasPermission,
  getTenantAdminId,
};
