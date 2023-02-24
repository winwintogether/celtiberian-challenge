const model = require('../models/publisher.model')
const { buildErrObject } = require('../helpers/utils')

const getPublishers = async () => {
  return new Promise((resolve, reject) => {
    model.find(
      {},
      '-updatedAt -createdAt',
      {
        sort: {
          name: 1
        }
      },
      (err, items) => {
        if (err) {
          reject(buildErrObject(422, err.message))
        }
        resolve(items)
      }
    )
  })
}

module.exports = {
  getPublishers
}
