// Dynamic module aliases based on environment
const moduleAlias = require('module-alias')
const path = require('path')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

const NODE_ENV = process.env.NODE_ENV || 'development'
const isProd = NODE_ENV === 'production'

// Define different paths based on environment
const basePath = isProd ? path.resolve(__dirname, 'dist') : path.resolve(__dirname)

// Register aliases
moduleAlias.addAliases({
  '~': basePath
})

console.log(`Module aliases configured for ${NODE_ENV} environment. Base path: ${basePath}`) 