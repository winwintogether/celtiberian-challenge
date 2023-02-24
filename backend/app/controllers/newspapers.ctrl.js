const { matchedData } = require('express-validator')
const newspaperService = require('../services/newspapers.service')
const { handleError, buildSuccObject } = require('../helpers/utils')
const { processPaginationNews } = require('../modules/newspaper.module')

/**
 * Gets Newspapers
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
exports.getNewspapers = async (req, res) => {
  try {
    const paginationNews = await newspaperService.getNewspapers(req)
    paginationNews.docs = await processPaginationNews(paginationNews.docs)
    res.status(200).json(paginationNews)
  } catch (error) {
    handleError(res, error)
  }
}

/**
 * Create item function called by route
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
exports.createNewspaper = async (req, res) => {
  try {
    req = matchedData(req)

    const newspaper = await newspaperService.createNewspaper(req)
    res.status(201).json(newspaper)
  } catch (error) {
    handleError(res, error)
  }
}

/**
 * Update Newspaper
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
exports.updateNewspaper = async (req, res) => {
  try {
    const id = req.params.newspaperId
    req = matchedData(req)
    const newspaper = await newspaperService.updateNewspaper(req, id)
    res.status(200).json(newspaper)
  } catch (error) {
    handleError(res, error)
  }
}

/**
 *  Delete newspaper
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
exports.deleteNewspaper = async (req, res) => {
  try {
    req = matchedData(req)
    // delete company
    await newspaperService.deleteNewspaper(req.newspaperId)
    res.status(200).json(buildSuccObject('NEWSPAPER_DELETED'))
  } catch (error) {
    handleError(res, error)
  }
}
