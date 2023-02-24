const model = require('../models/publisher.model')
const { buildErrObject, itemNotFound } = require('../helpers/utils')

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

/**
 * Finds publishers
 */
const findPublishersByIds = async ids => {
  return new Promise((resolve, reject) => {
    model.find({ _id: { $in: ids } }, (err, publishers) => {
      itemNotFound(err, publishers, reject, 'PUBLISHERS_NOT_FOUND')
      resolve(publishers)
    })
  })
}

module.exports = {
  getPublishers,
  findPublishersByIds
}
