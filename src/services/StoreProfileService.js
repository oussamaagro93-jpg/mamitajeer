const { StoreProfile } = require('../models');
const ApiError = require('../utils/ApiError');
const { resolveAdminId } = require('../utils/tenant');

const STRING_FIELDS = ['name', 'phone', 'whatsapp', 'email', 'address'];
const URL_FIELDS = ['logo', 'facebook', 'instagram', 'x'];

function normalizeString(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

function normalizeUrl(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch (error) {
    throw new ApiError(400, 'Invalid URL');
  }
}

class StoreProfileService {
  async findByAdminId(adminId) {
    if (!adminId) return null;
    return StoreProfile.findOne({ where: { adminId } });
  }

  async get(tenantId) {
    const adminId = await resolveAdminId(tenantId);
    if (!adminId) return null;
    return this.findByAdminId(adminId);
  }

  async update(data, tenantId) {
    const adminId = await resolveAdminId(tenantId);
    if (!adminId) throw new ApiError(400, 'An admin account is required to save store information');

    const values = {};
    STRING_FIELDS.forEach(function (field) {
      if (data[field] !== undefined) values[field] = normalizeString(data[field]);
    });
    URL_FIELDS.forEach(function (field) {
      if (data[field] !== undefined) values[field] = normalizeUrl(data[field]);
    });

    let profile = await StoreProfile.findOne({ where: { adminId } });
    if (profile) {
      await profile.update(values);
    } else {
      profile = await StoreProfile.create(Object.assign({}, values, { adminId }));
    }

    return profile;
  }

  toPublic(profile) {
    if (!profile) return null;
    const json = profile.toJSON ? profile.toJSON() : profile;
    return {
      name: json.name || null,
      logo: json.logo || null,
      phone: json.phone || null,
      whatsapp: json.whatsapp || null,
      email: json.email || null,
      address: json.address || null,
      facebook: json.facebook || null,
      instagram: json.instagram || null,
      x: json.x || null,
    };
  }
}

module.exports = new StoreProfileService();
