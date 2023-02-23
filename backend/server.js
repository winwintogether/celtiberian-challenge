// make bluebird default Promise
Promise = require('bluebird') // eslint-disable-line no-global-assign
const http = require('http')

const app = require('./config/express')
const initializeSocket = require('./config/socket')

const { port, env } = require('./config/vars')
const { consoleLogWrapper } = require('./app/helpers/utils')

const server = http.createServer(app)

// initialize socket handlers
initializeSocket(server)

// listen to requests
server.listen(port, () =>
  consoleLogWrapper(true, `App started on port ${port} (${env})`)
)

/**
 * Exports express
 * @public
 */
module.exports = server
