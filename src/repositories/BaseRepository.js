class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findAll(options = {}) {
    return this.model.findAndCountAll(options);
  }

  async findById(id, options = {}) {
    return this.model.findByPk(id, options);
  }

  async findOne(options = {}) {
    return this.model.findOne(options);
  }

  async create(data, options = {}) {
    return this.model.create(data, options);
  }

  async bulkCreate(data, options = {}) {
    return this.model.bulkCreate(data, options);
  }

  async updateById(id, data, options = {}) {
    const instance = await this.findById(id);
    if (!instance) return null;
    return instance.update(data, options);
  }

  async deleteById(id, options = {}) {
    const instance = await this.findById(id);
    if (!instance) return false;
    await instance.destroy(options);
    return true;
  }

  async findOrCreate(where, defaults = {}) {
    return this.model.findOrCreate({ where, defaults });
  }
}

module.exports = BaseRepository;
