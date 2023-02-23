const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const compression = require('compression')
const helmet = require('helmet')
const cors = require('cors')
const passport = require('passport')
const app = express()
const sentry = require('@sentry/node')
const useragent = require('express-useragent')

const initMongo = require('./mongo')

const {
  env,
  corsOptions,
  bodyParseJson,
  bodyParseUrlencoded,
  sentryDSN
} = require('./vars')


if (env === 'production' && sentryDSN) {
  sentry.init({ dsn: sentryDSN })
}

app.use(bodyParser.json(bodyParseJson))

app.use(bodyParser.urlencoded(bodyParseUrlencoded))

app.use(cors(corsOptions))

app.use(passport.initialize())

app.use(compression())

app.use(helmet())

app.use(useragent.express())

app.use(morgan('dev'))

app.use('/api', require('../app/routes'))

// Init MongoDB
initMongo()

module.exports = app // for testing
