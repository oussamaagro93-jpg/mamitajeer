const crypto = require('crypto');
const slugify = require('slugify');

const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
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

const sanitizeHtml = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

const paginate = ({ page = 1, limit = 10 }) => {
  const offset = (page - 1) * limit;
  return { limit: parseInt(limit, 10), offset: parseInt(offset, 10), page: parseInt(page, 10) };
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
  generateSKU,
  generateBarcode,
  createSlug,
  sanitizeHtml,
  paginate,
  getPaginationMeta,
};
