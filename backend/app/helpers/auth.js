const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const algorithm = 'aes-256-cbc'
const uuid = require('uuid')
const { jwtSecret, wePayAPIKey, jwtExpiration } = require('../../config/vars')
const { buildErrObject } = require('./utils')
const { roleType, permissionType } = require('../../config/types')
const iv = '1234567890123456' // 16 letters
const LOGIN_ATTEMPTS = 5
const TWO_FACTOR_ATTEMPTS = 5

/**
 * Checks is password matches
 * @param {string} password - password
 * @param {Object} user - user object
 * @returns {Promise}
 */
const checkPassword = async (password, user) => {
  return new Promise((resolve, reject) => {
    user.comparePassword(password, (err, isMatch) => {
      if (err) {
        reject(this.buildErrObject(422, err.message))
      }
      if (!isMatch) {
        resolve(false)
      }
      resolve(true)
    })
  })
}

/**
 * Checks is verification matches
 * @param {string} code - verification
 * @param {Object} twoFactor - twoFactor object
 * @returns {Promise}
 */
const checkTwoFactorVerification = async (code, twoFactor) => {
  return new Promise((resolve, reject) => {
    twoFactor.compareVerification(code, (err, isMatch) => {
      if (err) {
        reject(this.buildErrObject(422, err.message))
      }
      if (!isMatch) {
        resolve(false)
      }
      resolve(true)
    })
  })
}

/**
 * Encrypts text
 * @param {string} text - text to encrypt
 */
const encrypt = text => {
  const cipher = crypto.createCipheriv(algorithm, jwtSecret, iv)
  let crypted = cipher.update(text, 'utf8', 'base64')
  crypted += cipher.final('base64')
  return crypted
}

/**
 * Decrypts text
 * @param {string} text - text to decrypt
 */
const decrypt = text => {
  const cipher = crypto.createDecipheriv(algorithm, jwtSecret, iv)
  let decrypted = cipher.update(text, 'base64', 'utf8')
  decrypted += cipher.final('utf8')
  return decrypted
}

/**
 * Generate WePay Auth Header
 *
 * @returns {boolean|{reference: string, signature: string, epoch: number}}
 */
const generateWePayAuthHeader = () => {
  try {
    const epoch = Math.floor(new Date().getTime() / 1000)
    const reference = uuid.v4()
    const privateKey = wePayAPIKey
    const payload = reference + epoch

    const signature = crypto
      .createHmac('sha512', privateKey)
      .update(payload)
      .digest('hex')

    return {
      'Content-Type': 'application/json',
      'Authentication-Reference': reference,
      'Authentication-Epoch': epoch,
      'Authentication-Signature': signature
    }
  } catch (err) {
    return false
  }
}

/**
 * Generates a token
 * @param {Object} user - user object
 */
const generateToken = user => {
  // Gets expiration time
  const expiration = Math.floor(Date.now() / 1000) + 60 * jwtExpiration
  const issuedAt = Math.floor(Date.now() / 1000) - 30

  // returns signed and encrypted token
  return {
    jwt: encrypt(
      jwt.sign(
        {
          data: {
            _id: user
          },
          exp: expiration,
          iat: issuedAt
        },
        jwtSecret
      )
    ),
    exp: expiration,
    iat: issuedAt
  }
}

/**
 * Generates a token
 * @param {Number} length
 */
const generateTwoFactorCode = (length = 6) => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXY23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }

  return result
}

/**
 * Checks that login attempts are greater than specified in constant and also
 * that blockexpires is less than now
 * @param {Object} user - user object
 */
const blockIsExpired = user =>
  user.loginAttempts > LOGIN_ATTEMPTS && user.blockExpires <= new Date()

/**
 * @param {Object} user
 */
const blockIsTwoFactorExpired = user =>
  user.twoFactorAttempts > TWO_FACTOR_ATTEMPTS &&
  user.twoFactorBlockExpires <= new Date()

/**
 * Checks if blockExpires from user is greater than now
 * @param {Object} user - user object
 */
const userIsBlocked = user => {
  if (user.blockExpires > new Date()) {
    throw buildErrObject(409, 'BLOCKED_USER')
  }
}

/**
 * Check Verification
 * @param {Object} user - user object
 */
const checkVerification = user => {
  if (!user.verified) {
    throw buildErrObject(409, 'NOT_VERIFIED_USER')
  }
}

/**
 * Checks if password is reset
 * @param {Object} user - user object
 */
const userIsPasswordSet = user => {
  if (!user.isPasswordSet) {
    throw buildErrObject(403, 'PASSWORD_NOT_RESET')
  }
}

/**
 * Checks if blockExpires from user is greater than now
 * @param {Object} user - user object
 */
const userIsTwoFactorBlocked = user => {
  if (user.twoFactorBlockExpires > new Date()) {
    throw buildErrObject(409, 'BLOCKED_USER_TWO_FACTOR')
  }
}

const checkTwoFactorExpires = twoFactor => {
  if (twoFactor.verificationExpires < new Date()) {
    throw buildErrObject(409, 'TWO_FACTOR_VERIFICATION_EXPIRED')
  }
}

const getUserForToken = (user, company) => {
  user.companyType = company.type
  user.companyLogo = company.logo
  user.isPaymentCompany = company.isPaymentCompany
  user.companyCanCreateOffer = company.canCreateOffer
  user.companyCanCreateRegularInvoice = company.canCreateRegularInvoice
  user.companyCanUseSalaryCalculator = company.canUseSalaryCalculator

  return user
}

/**
 * check Allow Login
 * @param {Object} company
 * @param {String} role
 */
const checkAllowLogin = (company, role) => {
  if (
    (role === roleType.MANAGER &&
      !company.permissions.includes(permissionType.ALLOW_MANAGER_LOGIN)) ||
    (role === roleType.WORKER &&
      !company.permissions.includes(permissionType.ALLOW_WORKER_LOGIN))
  ) {
    throw buildErrObject(403, 'USER_ACCOUNT_DISABLED')
  }
}

module.exports = {
  checkPassword,
  encrypt,
  decrypt,
  generateWePayAuthHeader,
  generateToken,
  generateTwoFactorCode,
  blockIsExpired,
  blockIsTwoFactorExpired,
  userIsBlocked,
  checkVerification,
  userIsTwoFactorBlocked,
  checkTwoFactorExpires,
  getUserForToken,
  userIsPasswordSet,
  checkAllowLogin,
  checkTwoFactorVerification
}
