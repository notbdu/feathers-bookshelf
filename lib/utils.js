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

module.exports = {
    queryBuilder: queryBuilder,
};
