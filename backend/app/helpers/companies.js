const ObjectID = require('mongodb').ObjectID
const {
  companyAllowType,
  companyAllowStateType,
  roleType,
  companyType
} = require('../../config/types')
const { permissionTypes } = require('../../config/constants')
const { isEqualIDs, buildErrObject } = require('./utils')

/**
 * @param allowedIds
 * @param company
 * @param type
 * @param companyId
 */
const getAllowedCompanyIds = (
  company,
  type = companyAllowType.INTERMEDIARY,
  allowedIds = [],
  companyId = null
) => {
  if (company.allowedCompanies && company.allowedCompanies.length) {
    company.allowedCompanies.forEach(item => {
      if (
        item.status === companyAllowStateType.ALLOWED &&
        item.type === type &&
        !isEqualIDs(item.companyId, companyId) // except payment company itself
      ) {
        allowedIds.push(new ObjectID(item.companyId))
      }
    })
    if (type === companyAllowType.INTERMEDIARY) {
      allowedIds.push(new ObjectID(company._id))
    }
  }
  return allowedIds
}

/**
 * @param user
 * @param req
 * @param isCreate
 */
const serializeCompanyData = (user, req, isCreate = false) => {
  // manager with normal company can't create hiring company
  if (isCreate) {
    if (
      user.role === roleType.MANAGER &&
      user.company.type !== companyType.INTERMEDIARY
    ) {
      throw buildErrObject(401, 'UNAUTHORIZED')
    }

    if (user.role === roleType.MANAGER) {
      req.type = companyType.NORMAL
      req.isPaymentCompany = false
      req.canCreateOffer = false
      req.canCreateRegularInvoice = false
      req.canUseSalaryCalculator = false
      req.requireSigning = true
      req.contractTypeIds = []
    }
  } else {
    if (!req.isPaymentCompany) {
      delete req.bccEmailAddresses
    }
    if (user.role === roleType.MANAGER) {
      delete req.isPaymentCompany
      delete req.contractTypeIds
      delete req.canCreateOffer
      delete req.viewOfferByPaymentManager
      delete req.canCreateRegularInvoice
      delete req.canUseSalaryCalculator
      delete req.contractTypeIds
      delete req.contractNotificationEmailAddresses
      delete req.requireSigning
      if (isEqualIDs(user.companyId, req.companyId)) {
        delete req.caoIds
        delete req.isCaoRequired
      }
    }
  }
  if (req.caoIds && req.caoIds.length) {
    req.caoIds = req.caoIds.filter(caoId => caoId)
  }
  return req
}

const checkCompanyPermissions = value => {
  const invalidPermission = value.find(
    permission => !permissionTypes.includes(permission)
  )
  return !invalidPermission
}

module.exports = {
  getAllowedCompanyIds,
  serializeCompanyData,
  checkCompanyPermissions
}
