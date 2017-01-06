const _ = require('lodash');
const Proto = require('uberproto');
const filter = require('feathers-query-filters');
const errors = require('feathers-errors');

class Service {
    constructor(options) {
        if (!options) throw new Error('Options have to be provided');
        if (!options.Model) throw new Error('You must provide a Model');

        this.Model = options.Model;
        this.id = options.id || 'id';
        this.paginate = options.paginate || {};
        this.events = options.events || {};
    }

    extend(obj) {
        return Proto.extend(obj, this);
    }

    errorHandler(err) {
        throw err;
    }

    queryBuilder(qb, query, parentKey) {
        const methods = {
            $or: 'orWhere',
            $ne: 'whereNot',
            $in: 'whereIn',
            $nin: 'whereNotIn',
        };

        const operators = {
            $lt: '<',
            $lte: '<=',
            $gt: '>',
            $gte: '>=',
            $like: 'like',
        };

        Object.keys(query || {}).forEach((key) => {
            const value = query[key];

            if (_.isPlainObject(value)) {
                return this.queryBuilder(qb, value, key);
            }

            const column = parentKey || key;
            const method = methods[key];
            const operator = operators[key] || '=';

            if (method) {
                if (key === '$or') {
                    const self = this;

                    return value.forEach((condition) => {
                        // Grouped 'orWhere' chain
                        qb[method](function() {
                            self.queryBuilder(this, condition);
                        });
                    });
                }
                return qb[method](column, value);
            }

            return qb.where(column, operator, value);
        });
    }

    _find(params, paginate) {
        const {filters, query} = filter(params.query || {}, paginate);
        const filterOptions = {};
        let q = new this.Model();

        // $select
        if (filters.$select) {
            q = q.query((qb) => {
                qb
                    .select(this.id)
                    .select(filters.$select);
            });
        }

        // Handle queries
        q = q.query((qb) => {
            this.queryBuilder(qb, query);
        });

        // $sort
        if (filters.$sort) {
            Object.keys(filters.$sort).forEach((key) => {
                q = q.orderBy(key, filters.$sort[key] === 1 ? 'asc' : 'desc');
            });
        }

        // $limit
        if (filters.$limit) {
            filterOptions.limit = filters.$limit;
        }

        // $skip
        if (filters.$skip) {
            filterOptions.offset = filters.$skip;
        }

        // Execute
        return q.fetchPage(filterOptions)
            .then((result) => {
                if (filters.$limit === 0) {
                    result.models = [];
                }

                return result;
            });
    }

    find(params) {
        const paginate = (params && typeof params.paginate !== 'undefined') ? params.paginate : this.paginate;

        return this._find(params, paginate)
            .then((result) => {
                if (!paginate.default) {
                    return result.models.map((model) => {
                        return Object.assign({}, model.attributes);
                    });
                }

                return {
                    total: result.pagination.rowCount,
                    limit: result.pagination.limit || 0,
                    skip: result.pagination.offset || 0,
                    data: result.models.map((model) => {
                        return Object.assign({}, model.attributes);
                    }),
                };
            })
            .catch(this.errorHandler);
    }

    _get(id, params) {
        const query = Object.assign({}, params.query);
        query[this.id] = id;

        return this._find(Object.assign({}, params, {query}))
            .then((result) => {
                if (result.models.length !== 1) {
                    throw new errors.NotFound(`No record found for id '${id}'`);
                }

                return result.models[0];
            });
    }

    get(id, params) {
        return this._get(id, params)
            .then((model) => {
                return Object.assign({}, model.attributes);
            })
            .catch(this.errorHandler);
    }

    _create(data, params) {
        const m = new this.Model(data);

        return m.save()
            .then((model) => {
                return this._get(model.id, params);
            });
    }

    create(data, params) {
        if (Array.isArray(data)) {
            return Promise.all(data.map((e) => {
                return this._create(e, params)
                    .then((model) => {
                        return Object.assign({}, model.attributes);
                    });
            }))
                .catch(this.errorHandler);
        }

        return this._create(data, params)
            .then((model) => {
                return Object.assign({}, model.attributes);
            })
            .catch(this.errorHandler);
    };

    _patch(model, data) {
        return model.save(data, {
            patch: true,
        });
    }

    patch(id, data, params) {
        if (id === null) {
            return this._find(params)
                .then((result) => {
                    return Promise.all(result.models.map((model) => {
                        return this._patch(model, data)
                            .then((model) => {
                                return Object.assign({}, model.attributes);
                            });
                    }));
                })
                .catch(this.errorHandler);
        }

        return this._get(id, params)
            .then((model) => {
                return this._patch(model, data);
            })
            .then((model) => {
                return Object.assign({}, model.attributes);
            })
            .catch(this.errorHandler);
    }

    _update(id, data, params) {
        return this._get(id, params)
            .then((model) => {
                // Create new attributes object with update data
                // Null any attribute not provided in update data
                const oldAttr = Object.assign({}, model.attributes);
                const newAttr = {};

                Object.keys(oldAttr).forEach((key) => {
                    if (data[key] === undefined) {
                        newAttr[key] = null;
                        return;
                    }

                    newAttr[key] = data[key];
                });

                // Avoid updating the id
                delete newAttr[this.id];

                return model.save(newAttr);
            });
    }

    update(id, data, params) {
        if (id === null) {
            return Promise.reject(new errors.BadRequest(`You can not replace multiple instances. Did you mean 'patch'?`));
        }

        return this._update(id, data, params)
            .then((model) => {
                return Object.assign({}, model.attributes);
            })
            .catch(this.errorHandler);
    }

    _remove(model) {
        return model.destroy();
    }

    remove(id, params) {
        if (id === null) {
            return this._find(params)
                .then((result) => {
                    return Promise.all(result.models.map((model) => {
                        const attr = Object.assign({}, model.attributes);
                        return this._remove(model)
                            .then(() => {
                                return attr;
                            });
                    }));
                })
                .catch(this.errorHandler);
        }

        return this._get(id, params)
            .then((model) => {
                const attr = Object.assign({}, model.attributes);
                return this._remove(model)
                    .then(() => {
                        return attr;
                    });
            })
            .catch(this.errorHandler);
    }
}

module.exports = (options) => {
    return new Service(options);
};
