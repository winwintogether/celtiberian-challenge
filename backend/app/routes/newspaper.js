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
router.get('/all', trimRequest.all, controller.getNewspapers)

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
router.post(
  '/id',
  trimRequest.all,
  validator.updateNewspaper,
  controller.updateNewspaper
)

/**
 * Delete newspaper
 */
router.delete(
  '/id',
  trimRequest.all,
  validator.deleteNewspaper,
  controller.deleteNewspaper
)
