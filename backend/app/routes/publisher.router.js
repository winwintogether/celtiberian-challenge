const express = require('express')
const router = express.Router({ mergeParams: true })
const trimRequest = require('trim-request')

const controller = require('../controllers/publishers.ctrl')

/**
 * Get Newspapers
 */
router.get('/', trimRequest.all, controller.getPublishers)

module.exports = router
