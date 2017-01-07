# feathers-bookshelf

A Bookshelf service for Feathers

## Installation

```bash
npm install feathers-bookshelf-service --save
```

## Documentation

Please refer to the [Feathers database adapter documentation](http://docs.feathersjs.com/databases/readme.html) for more details or directly at:

- [Bookshelf](http://bookshelfjs.org) - The detailed documentation for this adapter
- [Extending](http://docs.feathersjs.com/databases/extending.html) - How to extend a database adapter
- [Pagination and Sorting](http://docs.feathersjs.com/databases/pagination.html) - How to use pagination and sorting for the database adapter
- [Querying](http://docs.feathersjs.com/databases/querying.html) - The common adapter querying mechanism


## Example

```js
const feathers = require('feathers');
const rest = require('feathers-rest');
const bodyParser = require('body-parser');
const knex = require('knex');
const Bookshelf = require('bookshelf');
const service = require('../lib');

// Create a Bookshelf instance
const bookshelf = Bookshelf(knex({
    client: 'sqlite3',
    connection: {
        filename: './db.sqlite',
    },
}));
bookshelf.plugin('pagination');

// Define model
const Todo = bookshelf.Model.extend({
    tableName: 'todos',
});

// Create Feathers app
const app = feathers()
    .configure(rest())
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({
        extended: true,
    }));

// Create '/todos' Bookshelf service
app.use('/todos', service({
    Model: Todo,
    name: 'todos',
    paginate: {
        default: 2,
        max: 4,
    },
}));

// Handle errors
app.use((err, req, res, next) => {
    res.json(err);
});

module.exports = () => {
    // Clean up database
    return bookshelf.knex.schema
        .dropTableIfExists('todos')
        .createTable('todos', (table) => {
            table.increments('id');
            table.string('text');
            table.boolean('complete');
        })
        .then(() => {
            // Start server
            return new Promise((resolve, reject) => {
                const server = app.listen(3030);

                server.on('listening', () => {
                    resolve(server);
                });
            });
        });
};
```

Run the example with `node example`.

## License

Licensed under the [MIT license](LICENSE).