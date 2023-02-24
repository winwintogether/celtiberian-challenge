const ObjectID = require('mongodb').ObjectID
const { buildErrObject, isEqualIDs, convertDayString } = require('./utils')
const { getAllowedCompanyIds } = require('../helpers/companies')
const {
  companyType,
  companyAllowType,
  dayListType,
  compensationUnitType,
  travelCompensationItemType,
  travelCompensationType,
  unitType
} = require('../../config/types')
const { dayLists } = require('../../config/constants')

/**
 * @param req
 * @param companies
 * @param status
 * @param type
 */
const canORP = (
  req,
  status,
  companies,
  type = companyAllowType.INTERMEDIARY
) => {
  let company
  let hiringCompany
  let paymentCompany
  let caoIds
  if (type === companyAllowType.INTERMEDIARY) {
    company = companies.find(item => isEqualIDs(item._id, req.companyId))
    hiringCompany = companies.find(item =>
      isEqualIDs(item._id, req.hiringCompanyId)
    )
    caoIds = hiringCompany.caoIds
  } else {
    paymentCompany = companies.find(item => isEqualIDs(item._id, req.companyId))
    hiringCompany = companies.find(item =>
      isEqualIDs(item._id, req.hiringCompanyId)
    )
    caoIds = hiringCompany.caoIds
    if (req.intermediaryCompanyId) {
      company = companies.find(item =>
        isEqualIDs(item._id, req.hiringCompanyId)
      )
    }
  }
  const allowedIds = getAllowedCompanyIds(
    type === companyAllowType.INTERMEDIARY ? company : paymentCompany,
    type,
    [new ObjectID(req.companyId)]
  )
  if (
    type === companyAllowType.INTERMEDIARY &&
    company.type === companyType.NORMAL
  ) {
    throw buildErrObject(403, 'NORMAL_COMPANY_NOT_CREATE_ORP')
  }
  if (!allowedIds.some(item => isEqualIDs(item, req.hiringCompanyId))) {
    throw buildErrObject(403, 'HIRING_COMPANY_NOT_FOUND')
  }
  if (!caoIds.includes(req.caoId)) {
    throw buildErrObject(403, 'CAO_NOT_FOUND')
  }
  if (type === companyAllowType.PAYMENT) {
    req.paymentCompanyId = req.companyId
    req.companyId = req.hiringCompanyId
    if (req.intermediaryCompanyId) {
      req.companyId = req.intermediaryCompanyId
    }
  }

  req.status = status
  if (req.travelCompensationItems && req.travelCompensationItems.length) {
    req.travelCompensationItems = req.travelCompensationItems.map(item => {
      item.type =
        item.item === travelCompensationItemType.WFH
          ? travelCompensationType.WFH
          : travelCompensationType.TRANSPORT
      return item
    })
  }
  if (req.fixedCompensationItems && req.fixedCompensationItems.length) {
    req.fixedCompensationItems = req.fixedCompensationItems.map(item => {
      if (!item.invoiceToHC) {
        item.invoiceRate = 0
      }
      return item
    })
  }
  if (req.isApplyFreelancer) {
    delete req.fixedCompensationItems
    delete req.travelCompensationItems
  }
  return req
}

const checkApplicability = weekdays => {
  if (
    weekdays.includes(dayListType.Weekdays) &&
    weekdays.includes(dayListType.Holiday)
  ) {
    return false
  }
  const invalidDay = weekdays.find(day => !dayLists.includes(day))
  return !invalidDay
}

const getCompensationSalary = (workLog, fixedItem) => {
  if (fixedItem.compensationUnit === compensationUnitType.HOUR) {
    return Number(workLog.timeSheetData.totalHours)
  } else if (fixedItem.compensationUnit === compensationUnitType.WEEK) {
    if (workLog.timeSheetData.totalHours) {
      return 1
    }
    return 0
  }
  let dayCount = 0
  workLog.timeSheetData.data.forEach(item => {
    if (
      (fixedItem.compensationUnit === compensationUnitType.DAY ||
        (fixedItem.compensationUnit === compensationUnitType.WEEK_DAY &&
          convertDayString(item.date) !== dayListType.Saturday &&
          convertDayString(item.date) !== dayListType.Sunday)) &&
      (item.normalWageHours ||
        (item.adjustedWages && item.adjustedWages.length))
    ) {
      dayCount++
    }
  })
  return dayCount
}

const getCompensationUnit = fixedItem => {
  if (fixedItem.compensationUnit === compensationUnitType.HOUR) {
    return unitType.PER_HOUR
  } else if (fixedItem.compensationUnit === compensationUnitType.WEEK) {
    return unitType.PER_WEEK
  }
  return unitType.PER_DAY
}

module.exports = {
  canORP,
  checkApplicability,
  getCompensationSalary,
  getCompensationUnit
}
