const { matchedData } = require('express-validator')
const newspaperService = require('../services/newspapers.service')
const { handleError, buildSuccObject } = require('../helpers/utils')

/**
 * Gets Newspapers
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
exports.getNewspapers = async (req, res) => {
  try {
    res.status(200).json(await newspaperService.getNewspapers(req))
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

    const count = await newspaperService.getNewspaperCount()
    req.id = count ? count + 1 : 1

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
    req = matchedData(req)
    const newspaper = await newspaperService.updateNewspaper(req)
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
    const id = req.companyId
    // delete company
    await newspaperService.deleteNewspaper(id)
    res.status(200).json(buildSuccObject('NEWSPAPER_DELETED'))
  } catch (error) {
    handleError(res, error)
  }
}
