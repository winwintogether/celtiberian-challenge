const express = require('express')
const router = express.Router()

router.use('/newspapers', require('./newspaper.router'))

router.use('/publishers', require('./publisher.router'))

router.use('/upload', require('./_uploads.router'))

/**
 * Handle 404 error
 */
router.use('*', (req, res) => {
  res.status(404).json({
    errors: {
      msg: 'URL_NOT_FOUND'
    }
  })
})

module.exports = router
