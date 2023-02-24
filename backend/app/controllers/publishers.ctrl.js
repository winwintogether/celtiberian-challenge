const newspaperService = require('../services/newspapers.service')
const { handleError } = require('../helpers/utils')

/**
 * Gets Newspapers
 * @param {Object} req - Request
 * @param {Object} res - Response
 */
exports.getPublishers = async (req, res) => {
  try {
    res.status(200).json(await newspaperService.getNewspapers(req))
  } catch (error) {
    handleError(res, error)
  }
}
