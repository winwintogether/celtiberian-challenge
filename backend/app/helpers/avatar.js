const fs = require('fs')
const imageType = require('image-type')
const path = require('path')
const readChunk = require('read-chunk')
const { difference } = require('lodash')
const isWindowsOS = process.platform === 'win32'

let sharp = null
if (!isWindowsOS) {
  sharp = require('sharp')
}

const getCropInfo = imageUrl => {
  const segments = imageUrl.split('?')
  let info = null

  if (segments.length === 2) {
    info = segments[segments.length - 1].split('&').reduce((map, str) => {
      const [key, value] = str.split('=')
      map[key] = parseInt(value)

      return map
    }, {})

    const diff = difference(
      ['left', 'top', 'width', 'height'],
      Object.keys(info)
    )

    // contains all keys
    if (!diff.length) {
      const left = Math.floor(Number(info.left))
      const top = Math.floor(Number(info.top))
      const width = Math.floor(Number(info.width))
      const height = Math.floor(Number(info.height))

      if (left >= 0 && top >= 0 && width > 0 && height > 0) {
        info = {
          left,
          top,
          width,
          height
        }
      } else {
        info = null
      }
    }
  }

  return info
}

/**
 * Process avatar image
 * @param {string} imageUrl name and crop details string
 */
exports.processImage = async imageUrl => {
  try {
    let segments = imageUrl.split('?')
    const cropInfo = getCropInfo(imageUrl)

    const imagePath = segments[0]
    segments = imagePath.split('/')
    const fileName = segments[segments.length - 1]

    segments.pop()
    const dirPath = segments.join('/')
    const fullImagePath = path.join(__dirname, `../..${imagePath}`)

    // check and make big dir
    const bigDirPath = path.join(__dirname, `../..${dirPath}/big`)
    if (!fs.existsSync(bigDirPath)) {
      fs.mkdirSync(bigDirPath)
    }

    // check and make small dir
    const smallDirPath = path.join(__dirname, `../..${dirPath}/small`)
    if (!fs.existsSync(smallDirPath)) {
      fs.mkdirSync(smallDirPath)
    }

    // check extension
    const buffer = readChunk.sync(fullImagePath, 0, 12)
    const type = imageType(buffer)

    // make big avatar
    const smallAvatarPath = `${smallDirPath}/${fileName}`
    const bigAvatarPath = `${bigDirPath}/${fileName}`
    if (isWindowsOS || !type || !['png', 'jpg'].includes(type.ext)) {
      fs.copyFile(fullImagePath, smallAvatarPath)
      fs.copyFile(fullImagePath, bigAvatarPath)
    } else if (cropInfo) {
      await sharp(fullImagePath)
        .extract(cropInfo)
        .resize(100)
        .toFile(smallAvatarPath)
      await sharp(fullImagePath)
        .extract(cropInfo)
        .resize(200)
        .toFile(bigAvatarPath)
    } else {
      await sharp(fullImagePath)
        .resize({ width: 100 })
        .toFile(smallAvatarPath)
      await sharp(fullImagePath)
        .resize({ width: 200 })
        .toFile(bigAvatarPath)
    }
  } catch (e) {
    console.log('avatar generation error:', e.message)
  }
}
