const crypto = require('crypto');
const slugify = require('slugify');

const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Date + time + random hex keeps order numbers readable while making a
// collision extremely unlikely (unlike the previous 5-digit random suffix).
const generateOrderNumber = (prefix = 'ORD') => {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const time = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${date}-${time}-${random}`;
};

const isOrderNumberConflict = (error) => {
  if (!error || error.name !== 'SequelizeUniqueConstraintError') return false;
  const fields = error.fields || {};
  return Object.prototype.hasOwnProperty.call(fields, 'order_number')
    || /order_number/i.test(error.message || '');
};

const generateSKU = (productName, categoryName = 'GEN') => {
  const prefix = categoryName.substring(0, 3).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${random}`;
};

const generateBarcode = () => {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString('hex');
  return `BC-${timestamp}-${random}`.toUpperCase();
};

const createSlug = (text) => {
  return slugify(text, { lower: true, strict: true });
};

const roundMoney = (value) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

const sanitizeHtml = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

const paginate = (query = {}) => {
  const parsedPage = parseInt(query.page, 10);
  const parsedLimit = parseInt(query.limit, 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, 500)
    : 10;
  return { limit, offset: (page - 1) * limit, page };
};

const getPaginationMeta = (count, page, limit) => {
  const totalPages = Math.ceil(count / limit);
  return {
    total: count,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

module.exports = {
  generateToken,
  generateOrderNumber,
  isOrderNumberConflict,
  generateSKU,
  generateBarcode,
  createSlug,
  roundMoney,
  sanitizeHtml,
  paginate,
  getPaginationMeta,
};
