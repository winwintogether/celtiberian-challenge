const { buildErrObject } = require('./utils')
const { roleType } = require('../../config/types')

/**
 * @param isCreation
 * @param user
 */
const canTask = ({ user, isCreation = false }) => {
  // const company = user.company
  // if (isCreated) {
  //   if (
  //     company.type !== companyType.INTERMEDIARY &&
  //     !company.isPaymentCompany
  //   ) {
  //     throw buildErrObject(403, 'NORMAL_COMPANY_NOT_CREATE_TASK')
  //   }
  // } else if (
  //   company &&
  //   company.type !== companyType.INTERMEDIARY &&
  //   !company.isPaymentCompany &&
  //   user.role !== roleType.ADMIN
  // ) {
  //   throw buildErrObject(403, 'NORMAL_COMPANY_NOT_TASK')
  // }

  if (isCreation && user.role !== roleType.MANAGER) {
    throw buildErrObject(403, 'ONLY_MANAGER_CAN_CREATE_TASK')
  }
  return true
}

/**
 * @param req
 */
const serializeTaskData = req => {
  if (req.attachments && req.attachments.length) {
    req.attachments = req.attachments.filter(attachment => attachment.name)
    if (!req.attachments.length) {
      delete req.attachments
    }
  }
  return req
}

module.exports = {
  canTask,
  serializeTaskData
}
