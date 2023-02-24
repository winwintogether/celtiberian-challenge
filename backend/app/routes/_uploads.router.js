const express = require('express')
const router = express.Router()
const multer = require('multer')
const controller = require('../controllers/upload.ctrl')
const { getImageUploadConfig } = require('../helpers/file')
const uploadImage = path => multer(getImageUploadConfig(path))

router.post(
  '/avatar',
  uploadImage('../../uploads/avatar').single('avatar'),
  controller.upload('/uploads/avatar')
)

module.exports = router
