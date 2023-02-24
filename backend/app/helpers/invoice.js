const { get: fullPathGet } = require('lodash')
const {
  buildErrObject,
  isEqualIDs,
  convertDecimalNumber,
  fullNameFormatter,
  fullAddressFormatter,
  getTravelDistanceExpenseRate,
  convertCurrencyString,
  toNLDateString,
  getWeekNumber,
  removeImageCropInfo,
  convertExcelDateFormat,
  convertStatus
} = require('./utils')
const { isFreelancerContract } = require('./joboffers')
const { getCompensationSalary, getCompensationUnit } = require('./orp')
const {
  companyType,
  companyAllowStateType,
  companyAllowType,
  unitType,
  invoiceType,
  roleType,
  workLogType,
  invoiceCategoryType,
  invoiceChargeType,
  invoiceStateType,
  languageType,
  invoicePeriodType
} = require('../../config/types')
const { weekList, monthList } = require('../../config/constants')

/**
 * @param req
 * @param type
 * @param user
 * @param isCreate
 */
const canManageInvoice = ({ req, type, user = {}, isCreate = false }) => {
  const { company, paymentCompany, hiringCompany, worker } = req
  if (company.type !== companyType.INTERMEDIARY) {
    throw buildErrObject(403, 'UNAUTHORIZED')
  }

  if (
    type === invoiceType.FREELANCER_TO_PAYMENT_COMPANY &&
    !worker.freelancer
  ) {
    throw buildErrObject(403, 'REGULAR_INVOICE_NOT_CREATED')
  }
  if (
    isCreate &&
    user.role === roleType.MANAGER &&
    type === invoiceType.COMPANY_TO_HIRING_COMPANY &&
    !company.canCreateRegularInvoice
  ) {
    throw buildErrObject(403, 'REGULAR_INVOICE_NOT_CREATED')
  }
  const allowed = company.allowedCompanies.find(
    item =>
      item.status === companyAllowStateType.ALLOWED &&
      item.type === companyAllowType.INTERMEDIARY &&
      isEqualIDs(item.companyId, hiringCompany._id)
  )
  if (!allowed && !isEqualIDs(company._id, hiringCompany._id)) {
    throw buildErrObject(403, 'UNAUTHORIZED')
  }

  // check VAT
  if (!paymentCompany.VAT) {
    throw buildErrObject(422, 'INVOICE_COMPANY_VAT_INVALID')
  }
  // check BIC
  if (!paymentCompany.BIC) {
    throw buildErrObject(422, 'INVOICE_COMPANY_BIC_INVALID')
  }
  // check IBAN
  if (!paymentCompany.IBAN) {
    throw buildErrObject(422, 'INVOICE_COMPANY_IBAN_INVALID')
  }

  // check allowNetherlandsVat
  if (req.allowNetherlandsVat) {
    if (!hiringCompany.VAT) {
      throw buildErrObject(422, 'INVOICE_HIRING_COMPANY_VAT_INVALID')
    }
    req.vatPercentage = 0
  }
  if (req.allowCrossBorderVat) {
    req.vatPercentage = 0
  }

  return req
}

const getSubTotalAmount = (items, type = '') => {
  let amount = 0
  if (items && items.length) {
    items.forEach(item => {
      item.totalAmount = 0
      if (item.chargeable === invoiceChargeType.YES) {
        if (type === workLogType.EXPENSE && !item.rate) {
          item.totalAmount = convertDecimalNumber(
            (Number(item.amount) * Number(item.chargeablePercentage)) / 100
          )
        } else {
          item.totalAmount = convertDecimalNumber(
            (Number(item.amount) *
              Number(item.rate) *
              Number(item.chargeablePercentage)) /
              100
          )
        }
      }
      amount += item.totalAmount
    })
  }
  return amount
}

const invoiceAmountUnitFormatter = (amount, unit) => {
  if (unit === unitType.PER_AMOUNT) {
    return amount >= 0
      ? `€${convertDecimalNumber(amount)}`
      : `- €${Math.abs(convertDecimalNumber(amount))}`
  } else if (unit) {
    unit = unit.replace(unitType.PER_HOUR, 'hours')
    unit = unit.replace(unitType.PER_DAY, 'days')
    unit = unit.replace(unitType.PER_WEEK, 'weeks')
    unit = unit.replace(unitType.PER_KILOMETER, 'km')
    return `${convertDecimalNumber(amount)} ${unit}`
  }
  return amount
}

const getInvoiceType = ({ companyId, paymentCompanyId, user }) => {
  let type
  // own payment company
  if (!paymentCompanyId || isEqualIDs(paymentCompanyId, companyId)) {
    if (user.freelancer) {
      // freelancer invoice
      type = invoiceType.FREELANCER_TO_PAYMENT_COMPANY
    } else {
      type = invoiceType.COMPANY_TO_HIRING_COMPANY
    }
    // 3rd party payment company
  } else if (user.role === roleType.MANAGER) {
    // broker invoice
    if (isEqualIDs(user.companyId, companyId)) {
      type = invoiceType.COMPANY_TO_PAYMENT_COMPANY
    } else {
      type = invoiceType.PAYMENT_COMPANY_TO_HIRING_COMPANY
    }
  } else if (user.freelancer) {
    type = invoiceType.FREELANCER_TO_PAYMENT_COMPANY
  } else if (user.role === roleType.ADMIN) {
    type = invoiceType.COMPANY_TO_PAYMENT_COMPANY
  } else {
    type = invoiceType.PAYMENT_COMPANY_TO_HIRING_COMPANY
  }
  return type
}

const getInvoiceSenderReceiver = (req, type) => {
  const data = {
    senderCompanyId: null,
    receiverCompanyId: null,
    sender: null,
    receiver: null
  }

  switch (type) {
    case invoiceType.COMPANY_TO_HIRING_COMPANY:
      data.senderCompanyId = req.companyId
      data.receiverCompanyId = req.hiringCompanyId
      data.sender = req.company
      data.receiver = req.hiringCompany
      break
    case invoiceType.PAYMENT_COMPANY_TO_HIRING_COMPANY:
      data.senderCompanyId = req.paymentCompanyId
      data.receiverCompanyId = req.hiringCompanyId
      data.sender = req.paymentCompany
      data.receiver = req.hiringCompany
      break
    case invoiceType.COMPANY_TO_PAYMENT_COMPANY:
      data.senderCompanyId = req.companyId
      data.receiverCompanyId = req.paymentCompanyId
      data.sender = req.company
      data.receiver = req.paymentCompany
      break
    case invoiceType.FREELANCER_TO_PAYMENT_COMPANY:
      data.senderCompanyId = req.workerId
      data.receiverCompanyId = req.paymentCompanyId
      data.sender = req.worker
      data.receiver = req.paymentCompany
      break
    default:
      return
  }

  return data
}

const getInvoiceProjectIds = workLogs => {
  const projectIds = []
  if (workLogs && workLogs.length) {
    workLogs.forEach(workLog => {
      if (workLog.type === workLogType.TIMESHEET) {
        workLog.timeSheetData.data.forEach(item => {
          if (item.projectId && !projectIds.includes(item.projectId)) {
            projectIds.push(item.projectId)
          }
        })
      }
      if (
        workLog.type === workLogType.EXPENSE &&
        workLog.expenseData.projectId &&
        !projectIds.includes(workLog.expenseData.projectId)
      ) {
        projectIds.push(workLog.expenseData.projectId)
      }
    })
  }
  return projectIds
}

const getWorkLogIds = invoice => {
  const workLogIds = []
  if (invoice.timeSheetItems && invoice.timeSheetItems.length) {
    invoice.timeSheetItems.forEach(item => {
      workLogIds.push(item.workLogId)
    })
  }
  if (invoice.expenseItems && invoice.expenseItems.length) {
    invoice.expenseItems.forEach(item => {
      workLogIds.push(item.workLogId)
    })
  }

  return workLogIds
}

const generateInvoicePONumber = projects => {
  return projects.map(project => `${project.code}`).join(',')
}

const getOtherExpenseUnitAmount = (expensesUnit, hours, workedDays) => {
  if (expensesUnit === unitType.PER_HOUR) {
    return convertDecimalNumber(hours)
  } else if (expensesUnit === unitType.PER_DAY) {
    return Number(workedDays)
  } else if (expensesUnit === unitType.PER_WEEK) {
    return hours > 0 ? 1 : 0
  }

  return 0
}

const getInvoiceRate = (type, jobOffer) => {
  if (type === invoiceType.COMPANY_TO_PAYMENT_COMPANY) {
    return jobOffer.brokerFee || 0
  } else if (isFreelancerContract(jobOffer.contractData.contractType)) {
    if (type === invoiceType.FREELANCER_TO_PAYMENT_COMPANY) {
      return jobOffer.freelancerData.BIJLAGE_2_HOURLY_RATE_FL_PC || 0
    }
    return jobOffer.freelancerData.BIJLAGE_3_HOURLY_RATE_PC_HC || 0
  }
  return jobOffer.payRate || 0
}

const getInitialInvoiceItem = ({ workLog, jobOffer, worker, rate }) => {
  return {
    workLogId: workLog._id,
    jobId: workLog.jobId,
    jobOfferId: jobOffer._id,
    jobTitle: jobOffer.jobTitle,
    workerId: worker._id,
    workerName: fullNameFormatter(worker),
    type: workLogType.TIMESHEET,
    category: invoiceCategoryType.REGULAR_HOURS,
    subCategory: '',
    weekNumber:
      workLog.type === workLogType.TIMESHEET
        ? workLog.timeSheetData.weekNumber
        : workLog.expenseData.weekNumber,
    rate,
    hourlyWage: jobOffer.hourlyWage,
    chargeable: invoiceChargeType.YES,
    chargeablePercentage: 100,
    unit: unitType.PER_HOUR,
    amount: 0,
    totalAmount: 0,
    date:
      workLog.type === workLogType.TIMESHEET
        ? new Date(workLog.timeSheetData.data[0].date)
        : new Date(workLog.expenseData.date),
    ORPId: null,
    ORPItemId: null
  }
}

const getInvoiceNewJobOffer = ({ jobOffers, worker, jobOffer }) => {
  if (
    jobOffers.findIndex(offer => isEqualIDs(offer._id, jobOffer._id)) === -1
  ) {
    return [
      {
        ...jobOffer,
        worker,
        weeksData: []
      }
    ]
  }
  return []
}

const updateInvoiceJobOfferWeekData = (workLogs, jobOffers) => {
  const _jobOffers = [...jobOffers]
  workLogs.forEach(workLog => {
    const jobOfferIndex = _jobOffers.findIndex(offer =>
      isEqualIDs(offer._id, workLog.jobOfferData._id)
    )
    if (
      workLog.type === workLogType.TIMESHEET &&
      _jobOffers[jobOfferIndex] &&
      _jobOffers[jobOfferIndex].weeksData.findIndex(
        data => data.weekNumber === workLog.timeSheetData.weekNumber
      ) === -1
    ) {
      _jobOffers[jobOfferIndex].weeksData.push({
        jobTitle: workLog.jobOfferData.jobTitle,
        weekNumber: workLog.timeSheetData.weekNumber,
        date: new Date(workLog.timeSheetData.data[0].date),
        totalHours: workLog.timeSheetData.totalHours,
        totalWorkedDays: workLog.timeSheetData.data
          ? workLog.timeSheetData.data.filter(
              item =>
                item.normalWageHours ||
                (item.adjustedWages && item.adjustedWages.length)
            ).length
          : 0
      })
    }
  })

  return _jobOffers
}

const generateTimeSheetItems = ({
  invoiceItem,
  workLog,
  jobOffer,
  type,
  codePercentageMap
}) => {
  const timeSheetArray = []
  const expenseArray = []
  if (workLog.timeSheetData.totalNormalWageHours) {
    timeSheetArray.push({
      ...invoiceItem,
      category: invoiceCategoryType.REGULAR_HOURS,
      amount: workLog.timeSheetData.totalNormalWageHours,
      totalAmount:
        Number(workLog.timeSheetData.totalNormalWageHours) *
        Number(invoiceItem.rate)
    })
  }

  if (workLog.timeSheetData.totalAdjustedWageHours) {
    const groupedAdjustHours = {}
    const adjustedHours = []
    workLog.timeSheetData.data.forEach(item => {
      if (item.adjustedWages.length) {
        adjustedHours.push(...item.adjustedWages)
      }
    })
    if (jobOffer.ORPId) {
      adjustedHours.forEach(item => {
        if (item.ORPItem) {
          const invoiceRate =
            isFreelancerContract(jobOffer.contractData.contractType) &&
            type === invoiceType.FREELANCER_TO_PAYMENT_COMPANY
              ? item.ORPItem.hourlyWageSurcharge
              : item.ORPItem.invoiceRate
          const amount = Number(item.adjustedWageHours) * Number(invoiceRate)
          if (!groupedAdjustHours[item.ORPItem._id]) {
            groupedAdjustHours[item.ORPItem._id] = {
              ...invoiceItem,
              rate: invoiceRate,
              category: item.ORPItem.invoiceLabel,
              code: item.percentCodeOfAdjustedWage,
              amount: item.adjustedWageHours,
              totalAmount: Number(amount),
              chargeablePercentage: 100,
              originalPercentage: 100,
              ORPItemId: item.ORPItem._id,
              ORPId: jobOffer.ORPId
            }
          } else {
            groupedAdjustHours[item.ORPItem._id].amount += Number(
              item.adjustedWageHours
            )
            groupedAdjustHours[item.ORPItem._id].totalAmount += amount
          }
        } else {
          // todo solve
        }
      })
    } else {
      adjustedHours.forEach(item => {
        const amount =
          (Number(item.adjustedWageHours) *
            Number(invoiceItem.rate) *
            Number(item.percentOfAdjustedWage)) /
          100

        if (!groupedAdjustHours[item.percentCodeOfAdjustedWage]) {
          groupedAdjustHours[item.percentCodeOfAdjustedWage] = {
            ...invoiceItem,
            category: invoiceCategoryType.ADJUSTED_HOURS,
            code: item.percentCodeOfAdjustedWage,
            amount: item.adjustedWageHours,
            totalAmount: Number(amount),
            chargeablePercentage:
              codePercentageMap[item.percentCodeOfAdjustedWage] || null,
            originalPercentage: item.percentOfAdjustedWage
          }
        } else {
          groupedAdjustHours[item.percentCodeOfAdjustedWage].amount += Number(
            item.adjustedWageHours
          )
          groupedAdjustHours[
            item.percentCodeOfAdjustedWage
          ].totalAmount += amount
        }
      })
    }
    Object.keys(groupedAdjustHours).forEach(key => {
      timeSheetArray.push(groupedAdjustHours[key])
    })
  }

  if (
    type === invoiceType.PAYMENT_COMPANY_TO_HIRING_COMPANY &&
    jobOffer.ORPId &&
    jobOffer.ORPData &&
    jobOffer.ORPData.fixedCompensationItems &&
    jobOffer.ORPData.fixedCompensationItems.length
  ) {
    jobOffer.ORPData.fixedCompensationItems.forEach(fixedItem => {
      if (fixedItem.invoiceToHC) {
        timeSheetArray.push({
          ...invoiceItem,
          ORPId: jobOffer.ORPId,
          category: invoiceCategoryType.FIXED_COMPENSATION,
          subCategory: fixedItem.description,
          rate: fixedItem.invoiceRate,
          unit: getCompensationUnit(fixedItem),
          amount: getCompensationSalary(workLog, fixedItem),
          totalAmount:
            Number(fixedItem.invoiceRate) *
            Number(getCompensationSalary(workLog, fixedItem))
        })
      }
    })
  }
  if (
    type !== invoiceType.COMPANY_TO_PAYMENT_COMPANY &&
    jobOffer.chargeTravelDistanceExpenses &&
    workLog.timeSheetData.totalDistanceTraveled
  ) {
    const travelDistanceExpenseRate = getTravelDistanceExpenseRate(
      jobOffer.travelDistanceExpenseRate
    )
    expenseArray.push({
      ...invoiceItem,
      category: invoiceCategoryType.TRAVEL_EXPENSES,
      unit: unitType.PER_KILOMETER,
      rate: travelDistanceExpenseRate,
      amount: workLog.timeSheetData.totalDistanceTraveled,
      totalAmount:
        Number(workLog.timeSheetData.totalDistanceTraveled) *
        travelDistanceExpenseRate
    })
  }

  return { timeSheetArray, expenseArray }
}

const generateExpenseItems = ({ type, jobOffer, workLog, invoiceItem }) => {
  const data = []

  if (
    type !== invoiceType.COMPANY_TO_PAYMENT_COMPANY &&
    jobOffer.chargeWorkLogExpenses
  ) {
    invoiceItem.type = workLogType.EXPENSE
    invoiceItem.weekNumber = workLog.expenseData.weekNumber

    data.push({
      ...invoiceItem,
      unit: unitType.PER_AMOUNT,
      projectId: workLog.expenseData.projectId,
      rate: 0,
      category: `${workLog.expenseData.category}_expenses`,
      amount: workLog.expenseData.amount,
      totalAmount: workLog.expenseData.amount
    })
  }

  return data
}

const generateOtherExpensesItems = ({
  jobOffers,
  type,
  timeSheetItems,
  expenseItems
}) => {
  const data = []

  jobOffers.forEach(jobOffer => {
    let invoiceItem = {
      workLogId: null,
      jobId: jobOffer.jobId,
      jobOfferId: jobOffer._id,
      workerId: jobOffer.worker._id,
      workerName: fullNameFormatter(jobOffer.worker),
      type: workLogType.EXPENSE,
      category: '',
      rate: 0,
      hourlyWage: jobOffer.hourlyWage,
      chargeable: invoiceChargeType.YES,
      chargeablePercentage: 100,
      unit: unitType.PER_HOUR,
      amount: 0,
      totalAmount: 0
    }
    jobOffer.weeksData.forEach(weekData => {
      invoiceItem = {
        ...invoiceItem,
        jobTitle: weekData.jobTitle,
        weekNumber: weekData.weekNumber,
        date: weekData.date
      }

      if (
        type === invoiceType.COMPANY_TO_HIRING_COMPANY ||
        type === invoiceType.PAYMENT_COMPANY_TO_HIRING_COMPANY
      ) {
        if (
          jobOffer.chargeTravelHoursExpenses &&
          jobOffer.travelHoursPerWeek > 0
        ) {
          data.push({
            ...invoiceItem,
            category: invoiceCategoryType.TRAVEL_TIME_EXPENSES,
            rate: jobOffer.payRate,
            amount: jobOffer.travelHoursPerWeek,
            totalAmount:
              Number(jobOffer.payRate) * Number(jobOffer.travelHoursPerWeek)
          })
        }

        if (jobOffer.chargeOtherExpenses && jobOffer.otherExpenses > 0) {
          const otherExpensesAmount = getOtherExpenseUnitAmount(
            jobOffer.otherExpensesUnit,
            weekData.totalHours,
            weekData.totalWorkedDays
          )
          data.push({
            ...invoiceItem,
            category: invoiceCategoryType.DEFAULT_EXPENSES,
            rate: jobOffer.otherExpenses,
            unit: jobOffer.otherExpensesUnit,
            amount: otherExpensesAmount,
            totalAmount: Number(jobOffer.otherExpenses * otherExpensesAmount)
          })
        }
      } else if (type === invoiceType.FREELANCER_TO_PAYMENT_COMPANY) {
        if (
          jobOffer.freelancerData &&
          jobOffer.freelancerData.BEMIDDELING_COMP_AMOUNT > 0
        ) {
          data.push({
            ...invoiceItem,
            category: invoiceCategoryType.MEDITATION_TIME_EXPENSES,
            rate: jobOffer.freelancerData.BEMIDDELING_COMP_AMOUNT,
            amount: -weekData.totalHours,
            totalAmount: -Number(
              jobOffer.freelancerData.BEMIDDELING_COMP_AMOUNT *
                weekData.totalHours
            )
          })
        }

        if (
          jobOffer.freelancerData &&
          jobOffer.freelancerData.VOORFINANCIERING_AMOUNT > 0
        ) {
          if (timeSheetItems && timeSheetItems.length) {
            const totalAmount = timeSheetItems.reduce((initial, item) => {
              let total = initial
              if (
                isEqualIDs(item.jobOfferId, jobOffer._id) &&
                item.weekNumber === weekData.weekNumber
              ) {
                total += Number(item.totalAmount)
              }
              return total
            }, 0)
            const rate = -jobOffer.freelancerData.VOORFINANCIERING_AMOUNT / 100
            data.push({
              ...invoiceItem,
              unit: unitType.PER_AMOUNT,
              category: invoiceCategoryType.FINANCE_TIME_EXPENSES,
              rate,
              amount: totalAmount,
              totalAmount: Number(rate * totalAmount)
            })
          }
        }
      }
    })

    if (
      jobOffer.freelancerData &&
      jobOffer.freelancerData.VOORFINANCIERING_AMOUNT > 0 &&
      expenseItems &&
      expenseItems.length
    ) {
      expenseItems.forEach(item => {
        if (isEqualIDs(item.jobOfferId, jobOffer._id)) {
          const rate = -jobOffer.freelancerData.VOORFINANCIERING_AMOUNT / 100
          data.push({
            ...invoiceItem,
            jobTitle: item.jobTitle,
            weekNumber: item.weekNumber,
            date: item.date,
            unit: unitType.PER_AMOUNT,
            category: invoiceCategoryType.FINANCE_TIME_EXPENSES,
            rate,
            amount: item.amount,
            totalAmount: item.totalAmount,
            isExpenses: true
          })
        }
      })
    }
  })

  return data
}

const generateInvoiceItems = (workLogs, type, codePercentageMap = {}) => {
  let timeSheetItems = []
  let expenseItems = []
  let jobOffers = []

  if (workLogs.length) {
    workLogs.forEach(workLog => {
      const jobOffer = workLog.jobOfferData
      const worker = workLog.worker
      if (jobOffer && worker) {
        const rate = getInvoiceRate(type, jobOffer)
        const invoiceItem = getInitialInvoiceItem({
          workLog,
          jobOffer,
          worker,
          rate
        })
        if (workLog.type === workLogType.TIMESHEET) {
          const { timeSheetArray, expenseArray } = generateTimeSheetItems({
            invoiceItem,
            workLog,
            jobOffer,
            type,
            codePercentageMap
          })
          timeSheetItems = [...timeSheetItems, ...timeSheetArray]
          expenseItems = [...expenseItems, ...expenseArray]
        } else {
          expenseItems.push(
            ...generateExpenseItems({
              type,
              jobOffer,
              workLog,
              invoiceItem
            })
          )
        }
        jobOffers.push(
          ...getInvoiceNewJobOffer({ jobOffers, worker, jobOffer })
        )
      }
    })
    jobOffers = updateInvoiceJobOfferWeekData(workLogs, jobOffers)
  }

  expenseItems.push(
    ...generateOtherExpensesItems({
      jobOffers,
      type,
      timeSheetItems,
      expenseItems
    })
  )

  return { timeSheetItems, expenseItems }
}

const serializeInvoiceData = ({ req, invoice = null, type = '' }) => {
  // check and get original data
  if (invoice) {
    if (
      invoice.timeSheetItems.length !== req.timeSheetItems.length ||
      invoice.expenseItems.length !== req.expenseItems.length
    ) {
      throw buildErrObject(422, 'INVOICE_INVALID_ITEMS')
    }
    req.timeSheetItems = req.timeSheetItems.map(item => {
      const reqItem = invoice.timeSheetItems.find(_item =>
        isEqualIDs(_item._id, item._id)
      )
      if (!reqItem) {
        throw buildErrObject(422, 'INVOICE_INVALID_ITEMS')
      }
      return {
        ...reqItem,
        ...item
      }
    })
    req.expenseItems = req.expenseItems.map(item => {
      const reqItem = invoice.expenseItems.find(_item =>
        isEqualIDs(_item._id, item._id)
      )
      if (!reqItem) {
        throw buildErrObject(422, 'INVOICE_INVALID_ITEMS')
      }
      return {
        ...reqItem,
        ...item
      }
    })
  }

  if (!invoice) {
    if (type === invoiceType.FREELANCER_TO_PAYMENT_COMPANY) {
      req.vatPercentage =
        req.company && req.company.country === 'Netherlands' ? 21 : 0
      req.allowCrossBorderVat = !(
        req.company && req.company.country === 'Netherlands'
      )
    } else if (type === invoiceType.PAYMENT_COMPANY_TO_HIRING_COMPANY) {
      if (Number(req.hiringCompany.applicableTaxRate) === -1) {
        req.vatPercentage = 0
        req.allowNetherlandsVat = true
      } else if (Number(req.hiringCompany.applicableTaxRate) === -2) {
        req.vatPercentage = 0
        req.allowCrossBorderVat = true
      } else {
        req.vatPercentage = req.hiringCompany.applicableTaxRate || 0
      }
    } else if (
      req.hiringCompany.country === 'Germany' &&
      Number(req.hiringCompany.applicableTaxRate) === 19
    ) {
      req.vatPercentage = req.hiringCompany.applicableTaxRate
    }
  }

  // recalculate sensitive data
  const totalTimeSheetAmount = getSubTotalAmount(req.timeSheetItems)
  const totalExpenseAmount = getSubTotalAmount(
    req.expenseItems,
    workLogType.EXPENSE
  )

  let totalOtherAmount = 0
  if (req.others && req.others.length) {
    req.others.forEach(item => {
      totalOtherAmount += convertDecimalNumber(item.total)
    })
    req.totalOtherAmount = convertDecimalNumber(totalOtherAmount)
  }

  const totalAmountVatExcluded =
    totalExpenseAmount + totalTimeSheetAmount + totalOtherAmount
  req.totalExpenseAmount = totalExpenseAmount
  req.totalTimeSheetAmount = totalTimeSheetAmount
  req.totalAmountVatExcluded = totalAmountVatExcluded
  req.totalVatAmount = convertDecimalNumber(
    (totalAmountVatExcluded * Number(req.vatPercentage)) / 100
  )
  req.totalAmount = convertDecimalNumber(
    totalAmountVatExcluded + req.totalVatAmount
  )
  if (
    req.hiringCompany &&
    req.hiringCompany.GAccountEnabled &&
    type === invoiceType.PAYMENT_COMPANY_TO_HIRING_COMPANY
  ) {
    req.GAccount =
      req.GAccount === undefined || req.GAccount === null
        ? req.hiringCompany.GAccount
        : req.GAccount
    req.CAccount = 100 - req.GAccount
  }

  return req
}

const getFormattedItems = (items, projects, type = '') => {
  return items
    .map(itm => {
      const item = { ...itm }
      if (item.rate) {
        item.formattedRate =
          item.category === invoiceCategoryType.FINANCE_TIME_EXPENSES
            ? item.rate
            : convertCurrencyString(item.rate)
      } else {
        item.rate = 0
        item.formattedRate = ' '
      }
      if (item.category === invoiceCategoryType.REGULAR_HOURS) {
        item.category = 'regular_hours'
      } else if (item.category === invoiceCategoryType.ADJUSTED_HOURS) {
        item.category = 'adjusted_hours'
      } else if (item.category === invoiceCategoryType.TRAVEL_EXPENSES) {
        item.category = 'travel_expenses'
      } else if (item.category === invoiceCategoryType.TRAVEL_TIME_EXPENSES) {
        item.category = 'travel_time_expenses'
      } else if (item.category === invoiceCategoryType.FOOD_EXPENSES) {
        item.category = 'food_expenses'
      } else if (item.category === invoiceCategoryType.OTHER_EXPENSES) {
        item.category = 'other_expenses'
      } else if (item.category === invoiceCategoryType.DEFAULT_EXPENSES) {
        item.category = 'default_expenses'
      } else if (
        item.category === invoiceCategoryType.MEDITATION_TIME_EXPENSES
      ) {
        item.category = 'meditation_time_expenses'
      } else if (item.category === invoiceCategoryType.FINANCE_TIME_EXPENSES) {
        item.category = 'finance_time_expenses'
      }

      if (item.weekNumber < 10) {
        item.weekNumber = `0${item.weekNumber}`
      }
      const year = new Date(item.date).getFullYear()
      item.yearWeek = `${year}-${item.weekNumber}`
      if (
        item.type === workLogType.EXPENSE &&
        (!item.rate || item.isExpenses)
      ) {
        item.yearWeek = `${item.yearWeek} (${toNLDateString(item.date)})`
      }
      item.jobTitle =
        item.jobTitle.length > 20
          ? `${item.jobTitle.slice(0, 20)}...`
          : item.jobTitle
      item.formattedAmount = invoiceAmountUnitFormatter(item.amount, item.unit)
      item.formattedTotalAmount = convertCurrencyString(item.totalAmount)
      item.formattedChargeable =
        item.chargeable === invoiceChargeType.YES
          ? invoiceChargeType.YES
          : invoiceChargeType.NO

      if (
        type === workLogType.EXPENSE &&
        item.projectId &&
        projects &&
        projects.length
      ) {
        const project = projects.filter(projectItem =>
          isEqualIDs(projectItem._id, item.projectId)
        )
        item.project =
          project && project[0] ? `${project[0].name} ${project[0].code}` : ''
      }
      return item
    })
    .filter(item => item.chargeable !== invoiceChargeType.HIDE)
    .sort((a, b) => {
      return (
        a.yearWeek.localeCompare(b.yearWeek) ||
        a.workerName.toUpperCase().localeCompare(b.workerName.toUpperCase())
      )
    })
}

const getInvoiceCompanyData = company => {
  return {
    name: company.name || '',
    city: company.city || '',
    logo: company.logo ? removeImageCropInfo(company.logo) : '',
    email: company.email || '',
    phone: company.phone || '',
    street: company.street || '',
    houseNumber: company.houseNumber || '',
    houseNumberAddition: company.houseNumberAddition || '',
    postalCode: company.postalCode || '',
    country: company.country || '',
    IBAN: company.IBAN || '',
    BIC: company.BIC || '',
    BTW: company.VAT || '',
    kvkNumber: company.kvkNumber || '',
    GAccountEnabled: company.GAccountEnabled || false,
    GAccount: company.GAccount || 0,
    GAccountIBAN: company.GAccountIBAN || '',
    invoiceLanguage: company.invoiceLanguage || languageType.EN,
    fullAddress: fullAddressFormatter(company)
  }
}

const getInvoiceData = invoice => {
  const { paymentCompany, hiringCompany, company } = invoice.information
  if (invoice.timeSheetItems && invoice.timeSheetItems.length) {
    invoice.timeSheetItems = getFormattedItems(
      invoice.timeSheetItems,
      workLogType.TIMESHEET
    )
  }

  if (invoice.expenseItems && invoice.expenseItems.length) {
    invoice.expenseItems = getFormattedItems(
      invoice.expenseItems,
      invoice.projects,
      workLogType.EXPENSE
    )
  }

  if (invoice.others && invoice.others.length) {
    invoice.others = invoice.others
      .map(itm => {
        const item = { ...itm }
        const year = new Date(item.date).getFullYear()
        item.weekNumber = getWeekNumber(item.date)
        if (item.weekNumber < 10) {
          item.weekNumber = `0${item.weekNumber}`
        }
        item.yearWeek = `${year}-${item.weekNumber}`
        item.formattedTotal = convertCurrencyString(item.total)
        item.formattedRate = convertCurrencyString(item.rate)
        return item
      })
      .sort((a, b) => {
        return a.yearWeek.localeCompare(b.yearWeek)
      })
  }

  if (
    hiringCompany.GAccountEnabled &&
    invoice.type === invoiceType.PAYMENT_COMPANY_TO_HIRING_COMPANY
  ) {
    invoice.CAccount = 100 - invoice.GAccount
    invoice.GAmount = (invoice.totalAmount * invoice.GAccount) / 100
    invoice.CAmount = (invoice.totalAmount * invoice.CAccount) / 100
  }
  let worker
  if (invoice.type === invoiceType.FREELANCER_TO_PAYMENT_COMPANY) {
    worker = {
      name: fullNameFormatter(invoice.information.worker) || '',
      city: invoice.information.worker.city || '',
      logo: invoice.information.worker.image
        ? removeImageCropInfo(invoice.information.worker.image)
        : '',
      email: invoice.information.worker.email || '',
      phone: invoice.information.worker.phone || '',
      street: invoice.information.worker.street || '',
      houseNumber: invoice.information.worker.houseNumber || '',
      houseNumberAddition: invoice.information.worker.houseNumberAddition || '',
      postalCode: invoice.information.worker.postalCode || '',
      country: invoice.information.worker.country || '',
      BIC: invoice.information.worker.bic || '',
      IBAN: invoice.information.worker.bankNumber || '',
      BTW: invoice.information.worker.freelancerData.BTW || '',
      companyName: invoice.information.worker.freelancerData.companyName || '',
      kvkNumber: invoice.information.worker.freelancerData.kvkNumber || '',
      GAccountIBAN:
        invoice.information.worker.freelancerData.GAccountIBAN || '',
      fullAddress: fullAddressFormatter(invoice.information.worker),
      permanentAddress: invoice.information.worker.permanentAddress || {}
    }
  }

  return {
    paymentCompany: getInvoiceCompanyData(paymentCompany),
    company: getInvoiceCompanyData(company),
    hiringCompany: getInvoiceCompanyData(hiringCompany),
    invoice: {
      number: invoice.number || '',
      submitDate: toNLDateString(invoice.submitDate),
      dueDate: toNLDateString(invoice.dueDate),
      timeSheetItems: invoice.timeSheetItems || [],
      expenseItems: invoice.expenseItems || [],
      others: invoice.others || [],
      status: invoice.status,
      type: invoice.type || '',
      updatedAt: toNLDateString(invoice.updatedAt),
      totalAmountVatExcluded: invoice.totalAmountVatExcluded,
      vatPercentage: invoice.vatPercentage,
      GAccount: invoice.GAccount,
      CAccount: invoice.CAccount,
      totalVatAmount: invoice.totalVatAmount,
      totalAmount: invoice.totalAmount,
      formattedTotalAmountVatExcluded: convertCurrencyString(
        invoice.totalAmountVatExcluded
      ),
      formattedTotalOtherAmount: convertCurrencyString(
        invoice.totalOtherAmount
      ),
      formattedTotalTimeSheetAmount: convertCurrencyString(
        getSubTotalAmount(invoice.timeSheetItems)
      ),
      formattedTotalExpenseAmount: convertCurrencyString(
        getSubTotalAmount(invoice.expenseItems, workLogType.EXPENSE)
      ),
      formattedTotalVatAmount: convertCurrencyString(invoice.totalVatAmount),
      formattedTotalAmount: convertCurrencyString(invoice.totalAmount),
      formattedCAmount: convertCurrencyString(invoice.CAmount),
      formattedGAmount: convertCurrencyString(invoice.GAmount),
      PONumber: invoice.PONumber || '',
      cancelledInvoiceNumber: invoice.cancelledInvoiceNumber,
      creditInvoiceNumber: invoice.creditInvoiceNumber,
      allowCrossBorderVat: invoice.allowCrossBorderVat,
      allowNetherlandsVat: invoice.allowNetherlandsVat
    },
    worker
  }
}

const calculateInvoiceTermOfPayment = (workLogs, type) => {
  let durationByDays = null
  if (workLogs && workLogs.length) {
    workLogs.forEach(log => {
      const jobOffer = log.jobOfferData
      let termOfPayment = jobOffer.termOfPayment
      if (type === invoiceType.FREELANCER_TO_PAYMENT_COMPANY) {
        termOfPayment = jobOffer.freelancerData
          ? jobOffer.freelancerData.BIJLAGE_2_VERGOEDINGEN_BETALINGSTERMIJN_MPC
          : ''
      }
      const durationCandidate = parseInt(termOfPayment)
      if (durationByDays === null || durationCandidate < durationByDays) {
        durationByDays = durationCandidate
      }
    })
  }

  return durationByDays ? `${durationByDays}_days` : ''
}

const getCreditInvoiceData = req => {
  const workLogIds = []
  if (req.timeSheetItems && req.timeSheetItems.length) {
    req.timeSheetItems.forEach(item => {
      item.totalAmount = -item.totalAmount
      workLogIds.push(item.workLogId)
    })
    req.totalTimeSheetAmount = -req.totalTimeSheetAmount
  }
  if (req.expenseItems && req.expenseItems.length) {
    req.expenseItems.forEach(item => {
      item.totalAmount = -item.totalAmount
      workLogIds.push(item.workLogId)
    })
    req.totalExpenseAmount = -req.totalExpenseAmount
  }
  if (req.others && req.others.length) {
    req.others.forEach(item => {
      item.rate = -item.rate
      item.total = -item.total
    })
    req.totalOtherAmount = -req.totalOtherAmount
  }
  req.totalAmountVatExcluded = -req.totalAmountVatExcluded
  req.totalVatAmount = -req.totalVatAmount
  req.totalAmount = -req.totalAmount
  req.status = invoiceStateType.CREDITED
  req.cancelledInvoiceNumber = req.number

  const currentDate = new Date()
  req.submitDate = currentDate
  req.dispatchDate = currentDate
  if (req.termOfPayment) {
    req.dueDate = new Date().setDate(
      req.submitDate.getDate() + Number(req.termOfPayment.split('_')[0])
    )
  }
  delete req._id
  return { invoice: req, workLogIds }
}

const getInvoiceName = number => {
  if (number) {
    const name = `000000${number}`
    return `invoice_${name.substr(name.length - 6)}.pdf`
  }
  return 'invoice.pdf'
}

const isChargeable = (value, { req, path }) => {
  const index = path.split('.')[0]
  const item = fullPathGet(req.body, index)
  return item.chargeable === invoiceChargeType.YES
}

const checkPeriod = (value, req) => {
  if (req.body.reference) {
    const periodType = req.body.reference.periodType
    let list = monthList
    if (periodType === invoicePeriodType.WEEKLY) {
      list = weekList
    }
    const length = value.filter(item => !list.includes(`${item}`)).length
    return !length
  }
  return false
}

const getInvoiceQuery = (req, type) => {
  const condition = {
    _id: req.invoiceId
  }
  if (type === companyType.PAYMENT) {
    condition.paymentCompanyId = req.companyId
    condition.$or = [
      { type: invoiceType.PAYMENT_COMPANY_TO_HIRING_COMPANY },
      { type: invoiceType.COMPANY_TO_PAYMENT_COMPANY },
      { type: invoiceType.FREELANCER_TO_PAYMENT_COMPANY }
    ]
  } else {
    condition.$or = [
      { companyId: req.companyId },
      { hiringCompanyId: req.companyId }
    ]
  }
  return condition
}

const getInvoiceDataToExcel = rows => {
  const json = []
  rows.forEach(item => {
    let relatedInvoiceNumber = ''
    if (item.status === invoiceStateType.CANCELLED) {
      relatedInvoiceNumber = item.creditInvoiceNumber
    } else if (item.status === invoiceStateType.CREDITED) {
      relatedInvoiceNumber = item.cancelledInvoiceNumber
    }
    if (item.status === invoiceStateType.PENDING) {
      item.submitDate = new Date()
      item.dueDate = new Date().setDate(
        new Date().getDate() + Number(item.termOfPayment.split('_')[0])
      )
    }
    const row = {
      'Invoice number': item.number,
      Type: item.type.toUpperCase(),
      Currency: item.currency,
      'VAT %': item.vatPercentage || 0,
      'VAT amount': item.totalVatAmount || 0,
      'Invoice date': convertExcelDateFormat(item.submitDate),
      'Net invoice amount': item.totalAmountVatExcluded || 0,
      'Invoice total': item.totalAmount || 0,
      Status: convertStatus(item.status),
      Sender:
        item.type === invoiceType.FREELANCER_TO_PAYMENT_COMPANY
          ? fullNameFormatter(item.sender)
          : item.sender.name,
      Receiver: item.receiver.name,
      'Created Date': convertExcelDateFormat(item.createdAt),
      'Credited date': convertExcelDateFormat(item.creditDate),
      'Payment date': convertExcelDateFormat(item.paidDate),
      'Due date': convertExcelDateFormat(item.dueDate),
      'Related Invoice': relatedInvoiceNumber
    }
    json.push(row)
  })
  return json
}

module.exports = {
  canManageInvoice,
  calculateInvoiceTermOfPayment,
  generateInvoiceItems,
  serializeInvoiceData,
  getInvoiceType,
  getInvoiceData,
  getCreditInvoiceData,
  getInvoiceProjectIds,
  generateInvoicePONumber,
  getOtherExpenseUnitAmount,
  getInvoiceSenderReceiver,
  getInvoiceName,
  getWorkLogIds,
  getInvoiceQuery,
  isChargeable,
  checkPeriod,
  getInvoiceDataToExcel
}
