import knex from 'knex'

import config from './knexfile'

export default knex(config(process.env.DATABASE_NAME, process.env.DATABASE_HOST, process.env.DATABASE_USER, process.env.DATABASE_PASSWORD, Number(process.env.DATABASE_PORT)))
