const ObjectID = require('mongodb').ObjectID
const { buildSuccObject, buildErrObject, itemNotFound } = require('./utils')

/**
 * Builds sorting
 * @param {string} sort - field to sort from
 * @param {number} order - order for query (1,-1)
 */
const buildSort = (sort, order) => {
  if (sort === '0') {
    return null
  }
  const sortBy = {}
  sortBy[sort] = order
  return sortBy
}

/**
 * Hack for mongoose-paginate, removes 'id' from results
 * @param {Object} result - result object
 */
const cleanPaginationID = result => {
  if (result && result.docs) {
    result.docs.map(element => delete element.id)
  }
  return result
}

/**
 * Builds initial options for query
 * @param {Object} req - query object
 */
const listInitOptions = req => {
  const order = req.query.order || -1
  const sort = req.query.sort || 'createdAt'
  const pagination = !(
    Number(req.query.pagination) === 0 ||
    (req.query.pagination && req.query.pagination === '0')
  )
  const sortBy = buildSort(sort, order)
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.size, 10) || 10
  return {
    sort: sortBy,
    lean: true,
    page,
    limit,
    pagination
  }
}

module.exports = {
  /**
   * Gets items from database
   * @param {Object} req - request object
   * @param {Object} model
   * @param {Object} query - query object
   */
  async getAggregateItems(req, model, query) {
    const options = listInitOptions(req)
    options.allowDiskUse = true
    return new Promise((resolve, reject) => {
      model.aggregatePaginate(query, options, (err, items) => {
        if (err) {
          reject(buildErrObject(422, err.message))
        }
        resolve(cleanPaginationID(items))
      })
    })
  }
}
