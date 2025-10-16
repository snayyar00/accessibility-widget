import { config } from 'dotenv'
import { resolve } from 'path'
import type { Knex } from 'knex'

// Load .env from the api folder (parent of config folder)
config({ path: resolve(__dirname, '../.env') })

const knexConfig = (database: string, host: string, user: string, password: string, port: number): Knex.Config => ({
  client: 'mysql2',
  connection: {
    database: database || process.env.DATABASE_NAME,
    host: host || process.env.DATABASE_HOST,
    user: user || process.env.DATABASE_USER,
    password: password || process.env.DATABASE_PASSWORD,
    port: port || Number(process.env.DATABASE_PORT),

    typeCast: function (field: any, next: any) {
      if (field.type === 'TIMESTAMP' && field.table === 'users' && field.name === 'password_changed_at') {
        return field.string()
      }

      return next()
    },
  },
  migrations: {
    tableName: 'migrations',
    directory: '../migrations',
    loadExtensions: ['.ts'],
  },
  seeds: { directory: '../seeds', recursive: true },
})

export default knexConfig
