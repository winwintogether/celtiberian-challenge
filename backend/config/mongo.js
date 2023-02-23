const mongoose = require('mongoose')
const { env, mongoUri } = require('./vars')
const { consoleLogWrapper } = require('../app/helpers/utils')

module.exports = () => {
  const connect = () => {
    mongoose.Promise = global.Promise

    mongoose.connect(
      mongoUri,
      {
        keepAlive: true,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
      },
      err => {
        if (env !== 'test') {
          if (env !== 'test') {
            // Prints initialization
            consoleLogWrapper(true, `Database: MongoDB`)
            if (!err) {
              consoleLogWrapper(true, `DB Connection: OK`)
            } else {
              consoleLogWrapper(false, `Error connecting to DB`)
            }
          }
        }
      }
    )
  }
  connect()

  mongoose.connection.on('error', console.log)
  mongoose.connection.on('disconnected', connect)
}
