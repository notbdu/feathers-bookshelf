const expect = require('chai').expect;
const feathers = require('feathers');
const knex = require('knex');
const Bookshelf = require('bookshelf');
const tests = require('feathers-service-tests');
const errors = require('feathers-errors');
const service = require('../lib');
const example = require('../example');

const bookshelf = Bookshelf(knex({
    client: 'sqlite3',
    connection: {
        filename: './db.sqlite',
    },
}));
bookshelf.plugin('pagination');

const Person = bookshelf.Model.extend({
    tableName: 'people',
});

const CustomPerson = bookshelf.Model.extend({
    tableName: 'custom_people',
    idAttribute: 'customid',
});

const clean = () => {
    return bookshelf.knex.schema
        .dropTableIfExists('people')
        .createTable('people', (table) => {
            table.increments('id');
            table.string('name');
            table.integer('age');
            table.integer('time');
            table.boolean('created');
        })
        .dropTableIfExists('custom_people')
        .createTable('custom_people', (table) => {
            table.increments('customid');
            table.string('name');
            table.integer('age');
            table.integer('time');
            table.boolean('created');
        });
};

describe('Feathers Knex Service', () => {
    const app = feathers()
        .use('people', service({
            Model: Person,
            events: ['testing'],
        }))
        .use('custom_people', service({
            Model: CustomPerson,
            id: 'customid',
            events: ['testing'],
        }));

    before((done) => {
        clean()
            .then(() => {
                done();
            })
            .catch((err) => {
                done(err);
            });
    });
    after((done) => {
        clean()
            .then(() => {
                done();
            })
            .catch((err) => {
                done(err);
            });
    });

    describe('Initialization', () => {
        describe('when missing options', () => {
            it('throws an error', () =>
                expect(service.bind(null)).to.throw('Options have to be provided')
            );
        });

        describe('when missing a Model', () => {
            it('throws an error', () =>
                expect(service.bind(null, {})).to.throw('You must provide a Model')
            );
        });
    });

    describe('Common functionality', () => {
        it('is CommonJS compatible', () => {
            expect(require('../lib')).to.be.a('function');
        });

        tests.base(app, errors, 'people');
        tests.base(app, errors, 'custom_people', 'customid');
    });

    describe('$like method', () => {
        beforeEach((done) => {
            app.service('/people').create({
                name: 'Charlie Brown',
                age: 10,
            }, done);
        });

        it('$like in query', () => {
            return app.service('/people').find({query: {name: {$like: '%lie%'}}})
                .then((data) => {
                    expect(data[0].name).to.be.equal('Charlie Brown');
                });
        });
    });
});

describe('Knex service example test', () => {
    let server;

    before((done) => {
        example()
            .then((result) => {
                server = result;
                done();
            })
            .catch((err) => {
                done(err);
            });
    });

    after((done) => {
        server.close(() => {
            done();
        });
    });

    tests.example();
});
