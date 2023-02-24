const XLSX = require('xlsx')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const uuid = require('uuid')
const { limitUploadFileSize } = require('../../config/vars')

// ========================================================================= //
// ============================ External functions ========================= //
// ========================================================================= //

/**
 *
 * @param filePath
 * @returns uploadConfig
 */
const getDocUploadConfig = filePath => {
  return {
    limits: { fileSize: limitUploadFileSize * 1024 * 1024 },
    storage: multer.diskStorage({
      destination: (req, file, next) => {
        next(null, path.join(__dirname, filePath))
      },
      filename: (req, file, next) => {
        const ext = file.mimetype.split('/')[1]
        next(null, `${uuid.v4()}-${Date.now()}.${ext}`)
      },
      fileFilter: (req, file, next) => {
        if (!file) {
          return next()
        }
        const ext = path.extname(file.originalname)
        if (ext !== '.pdf' && ext !== '.doc' && ext !== 'docx') {
          return next(new Error('FILE_NOT_SUPPORTED'))
        }
        return next(null, true)
      }
    })
  }
}

/**
 *
 * @param filePath
 * @returns uploadConfig
 */
const getImageUploadConfig = filePath => {
  return {
    limits: { fileSize: limitUploadFileSize * 1024 * 1024 },
    storage: multer.diskStorage({
      destination: (req, file, next) => {
        next(null, path.join(__dirname, filePath))
      },
      filename: (req, file, next) => {
        const ext = file.mimetype.split('/')[1]
        return next(null, `${uuid.v4()}-${Date.now()}.${ext}`)
      },
      fileFilter: (req, file, next) => {
        if (!file) {
          return next()
        }
        const image = file.mimetype.startsWith('image/')
        if (image) {
          return next(null, true)
        }
        return next(new Error('FILE_NOT_SUPPORTED'))
      }
    })
  }
}

/**
 *
 * @param filePath
 * @returns uploadConfig
 */
const getImageAndDocUploadConfig = filePath => {
  return {
    limits: { fileSize: limitUploadFileSize * 1024 * 1024 },
    storage: multer.diskStorage({
      destination: (req, file, next) => {
        next(null, path.join(__dirname, filePath))
      },
      filename: (req, file, next) => {
        const ext = file.mimetype.split('/')[1]
        return next(null, `${uuid.v4()}-${Date.now()}.${ext}`)
      },
      fileFilter: (req, file, next) => {
        if (!file) {
          return next()
        }
        const image = file.mimetype.startsWith('image/')
        const ext = path.extname(file.originalname)
        if (!image && ext !== '.pdf' && ext !== '.doc' && ext !== 'docx') {
          return next(null, true)
        }
        return next(new Error('FILE_NOT_SUPPORTED'))
      }
    })
  }
}

/**
 *
 * @param filePath
 * @returns {Promise<boolean>}
 */
const deleteFile = filePath => {
  return new Promise((resolve, reject) => {
    try {
      fs.unlink(filePath, () => {
        resolve(true)
      })
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Export Excel
 */
const exportExcel = (content, formulaIn = null) => {
  const Sheets = {}
  const SheetNames = []
  let worksheet
  if (content) {
    for (let i = 0; i < content.length; i++) {
      if (content[i].data.length) {
        worksheet = XLSX.utils.json_to_sheet(content[i].data)
        Object.assign(Sheets, { [content[i].title]: worksheet })
        SheetNames.push(content[i].title)
      }
      if (formulaIn) {
        for (let y = 0; y < content[i].data.length; y++) {
          // eslint-disable-next-line max-depth
          if (worksheet[formulaIn + (y + 2)].index) {
            worksheet[formulaIn + (y + 2)].l = {
              Target: worksheet[formulaIn + (y + 2)].url,
              Tooltip: worksheet[formulaIn + (y + 2)].url
            }
            worksheet[formulaIn + (y + 2)].v = `${content[i].title}_${
              worksheet[formulaIn + (y + 2)].index
            }`
          } else {
            worksheet[formulaIn + (y + 2)].l = {
              Target: worksheet[formulaIn + (y + 2)].v,
              Tooltip: worksheet[formulaIn + (y + 2)].v
            }
            worksheet[formulaIn + (y + 2)].v = `${content[i].title}_${y + 1}`
          }
        }
      }
    }
  }
  const workbook = { Sheets, SheetNames }
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
}

module.exports = {
  getDocUploadConfig,
  getImageUploadConfig,
  getImageAndDocUploadConfig,
  deleteFile,
  exportExcel
}
