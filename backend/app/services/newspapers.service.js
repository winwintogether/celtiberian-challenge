const model = require('../models/newspaper.model')
const { getAggregateItems } = require('../helpers/db')
const {
  buildErrObject,
  itemNotFound,
  buildSuccObject
} = require('../helpers/utils')

/**
 * Gets items
 * @param {Object} req - request object
 */
const getNewspapers = async req => {
  const searchQuery = {}
  if (req.query && req.query.title) {
    searchQuery.title = { $regex: new RegExp(req.query.title, 'i') }
  }
  const aggregateQuery = model.aggregate([{ $match: searchQuery }])
  return await getAggregateItems(req, model, aggregateQuery)
}

/**
 * Creates Newspaper
 * @param {Object} req - request object
 */
const createNewspaper = async req => {
  return new Promise((resolve, reject) => {
    const newspaper = new model({
      title: req.title,
      link: req.link,
      abstract: req.abstract,
      languages: req.languages,
      publisherId: req.publisherId,
      image: req.image
    })
    newspaper.save((err, item) => {
      if (err) {
        reject(buildErrObject(422, err.message))
      }
      resolve(item)
    })
  })
}

/**
 * Updates newspaper
 * @param {Object} req - request object
 * @param {String} id - request object
 */
const updateNewspaper = async (req, id) => {
  return new Promise((resolve, reject) => {
    model.findByIdAndUpdate(
      id,
      req,
      {
        new: true,
        runValidators: true
      },
      (err, newspaper) => {
        itemNotFound(err, newspaper, reject, 'NEWSPAPER_NOT_UPDATED')
        resolve(newspaper)
      }
    )
  })
}

/**
 * Delete newspaper
 * @param {int} id - id
 */
const deleteNewspaper = async id => {
  return new Promise((resolve, reject) => {
    model.deleteOne({ _id: id }, (err, res) => {
      itemNotFound(err, res, reject, 'NEWSPAPER_NOT_DELETED')
      resolve(buildSuccObject('NEWSPAPER_DELETED'))
    })
  })
}

/**
 * Get Newspaper Count
 * @returns {Promise<any>}
 */
const getNewspaperCount = async () => {
  return model.countDocuments()
}

module.exports = {
  getNewspapers,
  createNewspaper,
  getNewspaperCount,
  updateNewspaper,
  deleteNewspaper
}
