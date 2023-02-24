require('../../config/passport')
const express = require('express')
const router = express.Router({ mergeParams: true })
const passport = require('passport')
const trimRequest = require('trim-request')

const controller = require('../controllers/newspapers.ctrl')
const validator = require('../validators/newspapers.validator')

/**
 * Get Newspapers
 */
router.get('/', trimRequest.all, controller.getNewspapers)

/**
 * Create newspaper
 */
router.post(
  '/',
  trimRequest.all,
  validator.createNewspaper,
  controller.createNewspaper
)

/**
 * Update newspaper
 */
router.patch(
  '/:newspaperId',
  trimRequest.all,
  validator.updateNewspaper,
  controller.updateNewspaper
)

/**
 * Delete newspaper
 */
router.delete(
  '/:newspaperId',
  trimRequest.all,
  validator.deleteNewspaper,
  controller.deleteNewspaper
)

module.exports = router
