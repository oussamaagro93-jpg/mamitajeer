const { Wilaya, Commune } = require('../models');
const ApiError = require('../utils/ApiError');
const { paginate, getPaginationMeta } = require('../utils/helpers');
const { Op } = require('sequelize');

class WilayaService {
  async findAll(query = {}) {
    const { page, limit, offset } = paginate(query);
    const { search, active } = query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { nameAr: { [Op.iLike]: `%${search}%` } },
        { nameFr: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (active !== undefined) {
      where.active = active === 'true' || active === true;
    }
    const result = await Wilaya.findAndCountAll({
      where,
      limit,
      offset,
      order: [['code', 'ASC']],
    });
    return { wilayas: result.rows, pagination: getPaginationMeta(result.count, page, limit) };
  }

  async findById(id) {
    const wilaya = await Wilaya.findByPk(id);
    if (!wilaya) throw new ApiError(404, 'Wilaya not found');
    return wilaya;
  }

  async findByCode(code) {
    const wilaya = await Wilaya.findOne({ where: { code } });
    if (!wilaya) throw new ApiError(404, 'Wilaya not found');
    return wilaya;
  }

  async create(data) {
    const existing = await Wilaya.findOne({ where: { code: data.code } });
    if (existing) throw new ApiError(400, 'A wilaya with this code already exists');
    return Wilaya.create(data);
  }

  async update(id, data) {
    const wilaya = await Wilaya.findByPk(id);
    if (!wilaya) throw new ApiError(404, 'Wilaya not found');
    if (data.code && data.code !== wilaya.code) {
      const existing = await Wilaya.findOne({ where: { code: data.code } });
      if (existing) throw new ApiError(400, 'A wilaya with this code already exists');
    }
    return wilaya.update(data);
  }

  async delete(id) {
    const wilaya = await Wilaya.findByPk(id);
    if (!wilaya) throw new ApiError(404, 'Wilaya not found');
    await wilaya.destroy();
    return true;
  }

  async getCommunes(wilayaId) {
    const wilaya = await Wilaya.findByPk(wilayaId);
    if (!wilaya) throw new ApiError(404, 'Wilaya not found');
    return Commune.findAll({
      where: { wilayaId, active: true },
      order: [['nameFr', 'ASC']],
    });
  }

  async getActive() {
    return Wilaya.findAll({
      where: { active: true },
      order: [['code', 'ASC']],
    });
  }
}

module.exports = new WilayaService();
