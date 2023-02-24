require('../../config/passport')
const express = require('express')
const router = express.Router({ mergeParams: true })
const passport = require('passport')
const trimRequest = require('trim-request')

const controller = require('../controllers/publishers.ctrl')

/**
 * Get Newspapers
 */
router.get('/', trimRequest.all, controller.getPublishers)

module.exports = router
