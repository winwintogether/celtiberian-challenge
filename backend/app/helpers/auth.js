const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const algorithm = 'aes-256-cbc'
const { jwtSecret, jwtExpiration } = require('../../config/vars')
const iv = '1234567890123456' // 16 letters

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

module.exports = {
  encrypt,
  decrypt,
  generateToken
}
