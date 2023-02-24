const i18n = require('i18n')
const requestIp = require('request-ip')
const { validationResult } = require('express-validator')
const validator = require('validator')
const moment = require('moment-timezone')
const status = require('statuses')
const { env } = require('../../config/vars')

/**
 * Removes extension from file
 * @param {string} file - filename
 */
exports.removeExtensionFromFile = file => {
  return file
    .split('.')
    .slice(0, -1)
    .join('.')
    .toString()
}

/**
 * Gets IP from user
 * @param {*} req - request object
 */
exports.getIP = req => requestIp.getClientIp(req)

/**
 * Gets browser info from user
 * @param {*} req - request object
 */
exports.getBrowserInfo = req => req.headers['user-agent']

/**
 * Gets country from user using CloudFlare header 'cf-ipcountry'
 * @param {*} req - request object
 */
exports.getCountry = req =>
  req.headers['cf-ipcountry'] ? req.headers['cf-ipcountry'] : 'XX'

/**
 * Handles error by printing to console in development env and builds and sends an error response
 * @param {Object} res - response object
 * @param {Object} err - error object
 */
exports.handleError = (res, err) => {
  // Prints error in console
  if (env === 'development') {
    console.log(err)
  }
  // Sends error to user
  if (err.code && status.codes.indexOf(err.code) >= 0) {
    res.status(err.code).json({
      errors: {
        msg: err.message
      }
    })
  } else {
    res.status(500).json({
      errors: {
        msg: err.message
      }
    })
  }
}

exports.handlePDFResponse = (res, data, fileName) => {
  if (data && fileName) {
    res
      .writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-disposition': `attachment;filename=${fileName}.pdf`,
        'Content-Length': Buffer.byteLength(data)
      })
      .end(data)
  } else {
    res.status(500).json({
      errors: {
        msg: 'Invalid PDF content'
      }
    })
  }
}

exports.handleExcelResponse = (res, data) => {
  if (data) {
    res
      .writeHead(200, {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
        'Content-Length': Buffer.byteLength(data)
      })
      .end(data)
  } else {
    res.status(500).json({
      errors: {
        msg: 'Invalid XLSX content'
      }
    })
  }
}

exports.handleHtmlResponse = (res, data) => {
  if (data && typeof data === 'string') {
    res
      .writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Length': data.length
      })
      .end(data)
  } else {
    res.status(500).json({
      errors: {
        msg: 'Invalid html content'
      }
    })
  }
}

/**
 * Builds error object
 * @param {number} code - error code
 * @param {string} message - error text
 */
exports.buildErrObject = (code, message) => {
  return {
    code,
    message
  }
}

/**
 * Builds success object
 * @param {string} message - success text
 */
exports.buildSuccObject = message => {
  return {
    msg: message
  }
}

/**
 * Builds error for validation files
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @param {Function} next - next object
 */
exports.validationResult = (req, res, next) => {
  try {
    validationResult(req).throw()
    if (req.body.email) {
      req.body.email = req.body.email.toLowerCase()
    }
    return next()
  } catch (err) {
    return this.handleError(res, this.buildErrObject(422, err.array()))
  }
}

exports.isDateString = str => {
  return String(str).match(
    /^(19[5-9][0-9]|20[0-4][0-9]|2050)[-\/](0?[1-9]|1[0-2])[-\/](0?[1-9]|[12][0-9]|3[01])$/gim
  )
}

exports.isObjectID = id => {
  return String(id).match(/^[0-9a-fA-F]{24}$/)
}

/**
 * Checks if given ID is good for MongoDB
 * @param {string} id - id to check
 */
exports.isIDGood = id => {
  const goodID = String(id).match(/^[0-9a-fA-F]{24}$/)
  if (!goodID) {
    throw this.buildErrObject(422, 'ID_MALFORMED')
  }
  return id
}

/**
 * Checks if given ID is good for MongoDB
 * @param id1 - id1 to check
 * @param id2 - id2 to check
 */
exports.isEqualIDs = (id1, id2) => {
  if (!id1 || !id2) {
    return false
  }
  return id1.toString().toLowerCase() === id2.toString().toLowerCase()
}

/**
 * Item not found
 * @param {Object} err - error object
 * @param {Object} item - item result object
 * @param {Function} reject - reject object
 * @param {String} message - message
 */
exports.itemNotFound = (err, item, reject, message) => {
  if (err) {
    reject(this.buildErrObject(422, err.message))
  }
  if (!item) {
    reject(this.buildErrObject(404, message))
  }
}

/**
 * Item already exists
 * @param {Object} err - error object
 * @param {Object} item - item result object
 * @param {Function} reject - reject object
 * @param {String} message - message
 */
exports.itemAlreadyExists = (err, item, reject, message) => {
  if (err) {
    reject(this.buildErrObject(422, err.message))
  }
  if (item) {
    reject(this.buildErrObject(422, message))
  }
}

exports.convertDayString = string => {
  if (string) {
    return moment(new Date(string)).format('dddd')
  }
  return ''
}

exports.toNLDateString = string => {
  if (string) {
    return moment.tz(new Date(string), 'Europe/Amsterdam').format('DD-MM-YYYY')
  }
  return ''
}

exports.toNLDateTimeString = string => {
  if (string) {
    return moment
      .tz(new Date(string), 'Europe/Amsterdam')
      .format('DD-MM-YYYY HH:mm:ss')
  }
  return ''
}

const toStandardDateString = string => {
  if (string) {
    return moment.tz(new Date(string), 'Europe/Amsterdam').format('YYYY-MM-DD')
  }
  return ''
}

exports.toStandardDateString = toStandardDateString

exports.convertDecimalNumber = (number, decimals = 2) => {
  if (number) {
    return Number(Number(number).toFixed(decimals))
  }
  return 0
}

exports.getWeekNumber = d => {
  d = new Date(d)
  // Copy date so don't modify original
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  // Calculate full weeks to nearest Thursday
  // Return array of year and week number
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}

exports.getDurationDate = ({
  date,
  duration = 0,
  type = 'days',
  mode = 'add'
}) => {
  if (mode === 'add') {
    return date ? moment(new Date(date)).add(duration, type) : ''
  }
  return date ? moment(new Date(date)).subtract(duration, type) : ''
}

exports.honorificFullNameFormatter = (title, fullName) => {
  if (!title) {
    return fullName
  }
  return `${title} ${fullName}`
}

exports.fullNameFormatter = data => {
  let fullName = ''
  if (data && data.fullName) {
    return data.fullName
  }
  if (data && data.firstName) {
    fullName = data.firstName
  }
  if (data && data.middleName) {
    fullName += ` ${data.middleName}`
  }
  if (data && data.lastName) {
    fullName += ` ${data.lastName}`
  }
  return fullName
}

exports.fullAddressFormatter = data => {
  let fullAddress = ''
  if (data && data.street) {
    fullAddress = data.street
  }
  if (data && data.houseNumber) {
    fullAddress += ` ${data.houseNumber}`
  }
  if (data && data.houseNumberAddition) {
    fullAddress += ` ${data.houseNumberAddition}`
  }
  return fullAddress
}

exports.termOfPaymentFormatter = term => {
  if (term) {
    term = term.replace('_days', ' dagen')
    term = term.replace('_weeks', ' weken')
    term = term.replace('_months', ' maanden')
    return term
  }
  return ''
}

exports.socialSecurityNumberFormatter = number => {
  if (number) {
    return number.slice(-3)
  }
  return ''
}
exports.removeImageCropInfo = imageUrl => {
  const segments = imageUrl.split('?')
  return segments[0]
}

const fullCompare = (baseKey, A, B) => {
  const result = {
    before: {},
    after: {}
  }

  if (
    B === undefined ||
    B === null ||
    baseKey === 'uploadedAt' ||
    baseKey === 'createdAt'
  ) {
    return result
  }

  if (Array.isArray(A)) {
    const isStringArray = A.every(item => typeof item === 'string')
    if (!isStringArray) {
      return result
    }
    const aStr = A.sort().join(', ')
    const bStr = B.sort().join(', ')
    if (aStr !== bStr) {
      result.after[baseKey] = A.join(', ')
      result.before[baseKey] = B.join(', ')
    }
    return result
  }

  if (A instanceof Date || B instanceof Date) {
    if (new Date(A).toDateString() !== B.toDateString()) {
      result.after[baseKey] = new Date(A)
      result.before[baseKey] = B
    }
    return result
  }
  if (typeof A === 'object') {
    for (const key in A) {
      const { before, after } = fullCompare(
        baseKey ? `${baseKey}:${key}` : key,
        A[key],
        B ? B[key] : undefined
      )
      Object.assign(result.before, before)
      Object.assign(result.after, after)
    }
    return result
  }

  if (String(A) !== String(B)) {
    result.after[baseKey] = A
    result.before[baseKey] = B
  }

  return result
}

exports.fullCompare = fullCompare

/**
 *
 * @param success
 * @param msg
 */
exports.consoleLogWrapper = (success, msg) => {
  if (success) {
    console.log('*******************  Info **********************')
  } else {
    console.log('******************* Error **********************')
  }
  console.log(`>>>> ${msg}`)
  console.log('************************************************')
}

exports.getTimeSheetYear = timesheet => {
  if (timesheet.data && timesheet.data.length > 0) {
    return new Date(timesheet.data[0].date).getFullYear().toString()
  }

  return null
}

exports.checkEmails = value => {
  const invalidEmail = value.find(email => !validator.isEmail(email))
  return !invalidEmail
}
exports.compareDate = (aDate, bDate) => {
  aDate = aDate || Infinity
  bDate = bDate || Infinity
  if (toStandardDateString(aDate) < toStandardDateString(bDate)) {
    return -1
  } else if (toStandardDateString(aDate) > toStandardDateString(bDate)) {
    return 1
  }
  return 0
}

exports.convertExcelDateFormat = string => {
  if (string) {
    return new Date(string)
  }
  return null
}

exports.convertStatus = item => {
  if (item) {
    return i18n.__(`status.${item}`)
  }
  return ''
}
