const path = require('path')

// import .env variables
require('dotenv-safe').config({
  allowEmptyValues: true,
  path: path.join(__dirname, '../.env'),
  sample: path.join(__dirname, '../.env.example')
})

const whitelist = []

if (
  process.env.NODE_ENV === 'development' ||
  process.env.ENABLE_LOCAL_CORS === 'true'
) {
  whitelist.push('http://localhost:8080')
  whitelist.push('http://localhost:3000')
}

const corsOptions = {
  origin(origin, callback) {
    // allow requests with no origin
    if (!origin) {
      return callback(null, true)
    }
    if (whitelist.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access.`
      return callback(new Error(msg), false)
    }
    return callback(null, true)
  }
}

const bodyParseJson = {
  limit: '50mb'
}

const bodyParseUrlencoded = {
  limit: '50mb',
  extended: true
}

module.exports = {
  env: process.env.NODE_ENV,
  port: process.env.PORT || 8080,
  mongoUri:
    process.env.NODE_ENV !== 'test'
      ? process.env.MONGO_URI
      : process.env.MONGO_TEST_URI,
  frontendUrl: process.env.FRONTEND_URL,
  limitUploadFileSize: process.env.LIMIT_UPLOAD_FILE_SIZE,
  corsOptions,
  bodyParseJson,
  bodyParseUrlencoded
}
