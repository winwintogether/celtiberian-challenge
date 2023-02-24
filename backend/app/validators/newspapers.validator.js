const { validationResult } = require('../helpers/utils')
const { check } = require('express-validator')

/**
 * Validates create newspaper request
 */
exports.createNewspaper = [
  check('title')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS_EMPTY')
    .isLength({ min: 3, max: 40 })
    .withMessage('WRONG_LENGTH'),
  check('link')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS_EMPTY'),
  check('abstract')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS_EMPTY'),
  check('image').optional({ nullable: true }),
  check('publisherId')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS_EMPTY'),
  check('languages')
    .optional({ nullable: true })
    .isArray(),
  (req, res, next) => {
    validationResult(req, res, next)
  }
]

/**
 * Validates update newspaper request
 */
exports.updateNewspaper = [
  check('newspaperId')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS_EMPTY')
    .isMongoId(),
  check('title')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS_EMPTY')
    .isLength({ min: 3, max: 40 })
    .withMessage('WRONG_LENGTH'),
  check('image').optional({ nullable: true }),
  check('link')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS_EMPTY'),
  check('abstract')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS_EMPTY'),
  check('publisherId')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS_EMPTY'),
  check('languages')
    .optional({ nullable: true })
    .isArray(),
  (req, res, next) => {
    validationResult(req, res, next)
  }
]

/**
 * Validates update newspaper request
 */
exports.deleteNewspaper = [
  check('newspaperId')
    .exists()
    .withMessage('MISSING')
    .not()
    .isEmpty()
    .withMessage('IS_EMPTY'),
  (req, res, next) => {
    validationResult(req, res, next)
  }
]
