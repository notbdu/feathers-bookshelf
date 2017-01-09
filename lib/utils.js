const _ = require('lodash');

const queryBuilder = (qb, query, parentKey) => {
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
            return queryBuilder(qb, value, key);
        }

        const column = parentKey || key;
        const method = methods[key];
        const operator = operators[key] || '=';

        if (method) {
            if (key === '$or') {
                return value.forEach((condition) => {
                    // Grouped 'orWhere' chain
                    qb[method](function() {
                        queryBuilder(this, condition);
                    });
                });
            }
            return qb[method](column, value);
        }

        return qb.where(column, operator, value);
    });
};

const createQuery = (q, id, filters, query) => {
    // $select
    if (filters.$select) {
        q = q.query((qb) => {
            qb
                .select(id)
                .select(filters.$select);
        });
    }

    // Handle queries
    q = q.query((qb) => {
        queryBuilder(qb, query);
    });

    // $sort
    if (filters.$sort) {
        Object.keys(filters.$sort).forEach((key) => {
            q = q.orderBy(key, filters.$sort[key] === 1 ? 'asc' : 'desc');
        });
    }

    return q;
};

const createPaginatedQuery = (q, id, filters, query) => {
    q = createQuery(q, id, filters, query);

    // $limit
    if (filters.$limit) {
        q = q.query((qb) => {
            qb.limit(filters.$limit);
        });
    }

    // $skip
    if (filters.$skip) {
        q = q.query((qb) => {
            qb.offset(filters.$skip);
        });
    }

    return q;
};

module.exports = {
    queryBuilder: queryBuilder,
    createQuery: createQuery,
    createPaginatedQuery: createPaginatedQuery,
};
