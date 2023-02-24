const ObjectID = require('mongodb').ObjectID
const {
  toNLDateString,
  toNLDateTimeString,
  getTimeSheetHoursName,
  getTravelDistanceExpenseRate,
  convertDecimalNumber,
  isEqualIDs,
  convertExcelDateFormat,
  convertStatus,
  fullNameFormatter,
  convertDayString
} = require('./utils')
const { generateInvoiceItems } = require('./invoice')
const { getUserName } = require('./users')
const {
  offerStateType,
  invoiceType,
  workLogType,
  workLogStateType,
  roleType,
  visibilityType,
  companyType,
  paymentArchiveType,
  salaryType,
  ORPWorkedHoursType,
  compensationUnitType,
  dayListType
} = require('../../config/types')
const { frontendUrl } = require('../../config/vars')
const { paymentIntervalTypes, workLogTypes } = require('../../config/constants')

const milSecsOfDay = 24 * 60 * 60 * 1000

const workLogCSVColumns = [
  {
    label: 'BSN',
    value: 'bsn'
  },
  {
    label: 'Date',
    value: 'date'
  },
  {
    label: 'PayrollRate',
    value: 'hourlyWage'
  },
  {
    label: 'InvoiceRate',
    value: 'payRate'
  },
  {
    label: 'Units',
    value: 'units'
  },
  {
    label: 'Type',
    value: 'hoursType'
  },
  {
    label: 'Percentage',
    value: 'percentage'
  },
  {
    label: 'Note',
    value: 'note'
  },
  {
    label: 'HC company',
    value: 'hiringCompany'
  },
  {
    label: 'LastName',
    value: 'lastName'
  },
  {
    label: 'FirstName',
    value: 'firstName'
  },
  {
    label: 'Birthday',
    value: 'birthday'
  },
  {
    label: 'CandidateID',
    value: 'candidateId'
  }
]

const generateWeekDates = dateString => {
  const currentDate = new Date(dateString)
  let currentDayOfWeek = currentDate.getDay() // 0 ~ 6 (sun - sat)
  currentDayOfWeek = currentDayOfWeek > 0 ? currentDayOfWeek - 1 : 6

  const monday = new Date(
    currentDate.getTime() - currentDayOfWeek * milSecsOfDay
  )
  const currentWeekDates = []
  for (let i = 0; i < 7; i++) {
    currentWeekDates.push({
      date: new Date(monday.getTime() + i * milSecsOfDay)
        .toISOString()
        .slice(0, 10)
    })
  }

  return currentWeekDates
}

const getMonthlyFormattedDates = generatedDates => {
  const monthOfFirstDay = new Date(generatedDates[0].date).getMonth()
  const monthOfLastDay = new Date(
    generatedDates[generatedDates.length - 1].date
  ).getMonth()
  const firstTimeSheet = []
  const secondTimeSheet = []
  if (monthOfFirstDay !== monthOfLastDay) {
    generatedDates.forEach(d => {
      if (new Date(d.date).getMonth() === monthOfLastDay) {
        firstTimeSheet.push({ ...d, isDisabled: true })
        secondTimeSheet.push(d)
      } else {
        secondTimeSheet.push({ ...d, isDisabled: true })
        firstTimeSheet.push(d)
      }
    })
    return [firstTimeSheet, secondTimeSheet]
  }
  return [generatedDates]
}

const getCompensationType = item => {
  return item.type === salaryType.GROSS
    ? paymentArchiveType.GROSS_COMPENSATION
    : paymentArchiveType.NET_COMPENSATION
}

const generateWeeksDates = (
  fromDateString,
  toDateString = null,
  isMonthly = true
) => {
  const toWeekDates = generateWeekDates(
    toDateString && new Date() > new Date(toDateString)
      ? new Date(toDateString)
      : new Date()
  )

  let fromDate = new Date(fromDateString).getTime()
  const generatedDates = generateWeekDates(fromDate)
  let weeksDates
  if (isMonthly) {
    weeksDates = [...getMonthlyFormattedDates(generatedDates)]
  } else {
    weeksDates = [generatedDates]
  }
  while (
    new Date(weeksDates[weeksDates.length - 1][0].date) <
    new Date(toWeekDates[0].date)
  ) {
    fromDate += 7 * milSecsOfDay
    const generatedWeekDates = generateWeekDates(fromDate)
    if (isMonthly) {
      weeksDates.push(...getMonthlyFormattedDates(generatedWeekDates))
    } else {
      weeksDates.push(generatedWeekDates)
    }
  }
  return weeksDates
}

const serializeWorkLogData = req => {
  if (
    req.type === workLogType.TIMESHEET &&
    req.timeSheetData &&
    req.timeSheetData.data &&
    req.timeSheetData.data.length
  ) {
    let totalNormalWageHours = 0
    let totalAdjustedWageHours = 0
    let totalDistanceTraveled = 0
    req.timeSheetData.data.forEach(item => {
      totalNormalWageHours += Number(item.normalWageHours)
      // remove the field that adjustedWageHours is equal to zero
      item.adjustedWages = item.adjustedWages.filter(wage =>
        Number(wage.adjustedWageHours)
      )
      const adjustedWageHours = item.adjustedWages.reduce((initial, wage) => {
        return initial + Number(wage.adjustedWageHours)
      }, 0)
      totalAdjustedWageHours += Number(adjustedWageHours)
      totalDistanceTraveled += Number(item.distanceTraveled)
    })
    req.timeSheetData.totalNormalWageHours = totalNormalWageHours
    req.timeSheetData.totalAdjustedWageHours = totalAdjustedWageHours
    req.timeSheetData.totalDistanceTraveled = totalDistanceTraveled
    req.timeSheetData.totalHours = totalNormalWageHours + totalAdjustedWageHours
  }

  if (req.type === workLogType.EXPENSE) {
    req.expenseData.month = new Date(req.expenseData.date).getMonth() + 1
    req.expenseData.year = new Date(req.expenseData.date)
      .getFullYear()
      .toString()
  }
  return req
}

const clearTimeSheetData = timeSheetData => {
  if (timeSheetData && timeSheetData.data && timeSheetData.data.length) {
    timeSheetData.totalNormalWageHours = 0
    timeSheetData.totalAdjustedWageHours = 0
    timeSheetData.totalDistanceTraveled = 0
    timeSheetData.totalHours = 0

    timeSheetData.data.forEach(item => {
      item.projectId = null
      item.breakTimeAmount = null
      item.startMinute = null
      item.startHour = null
      item.endHour = null
      item.endMinute = null
      item.normalWageHours = 0
      item.adjustedWages = []
      item.distanceTraveled = 0
      item.isTravelExpense = false
    })
    return timeSheetData
  }
}

const isExistedTimeSheet = (worklogs, weekDates) => {
  return worklogs.findIndex(worklog => {
    if (
      worklog.timeSheetData.data &&
      worklog.timeSheetData.data[0].date.includes('/')
    ) {
      return (
        worklog.timeSheetData.data[0].date ===
        new Date(weekDates[0].date).toLocaleDateString()
      )
    }
    return (
      worklog.timeSheetData.data &&
      worklog.timeSheetData.data[0].date === weekDates[0].date
    )
  })
}

const canGenerateTimeSheets = offer => {
  return (
    offer &&
    ((offer.status === offerStateType.ACTIVE &&
      offer.intermediaryStatus === offerStateType.ACTIVE) ||
      (offer.status === offerStateType.EXPIRED &&
        offer.intermediaryStatus === offerStateType.EXPIRED))
  )
}

const generateWorkLogArchiveRow = ({
  type = workLogType.TIMESHEET,
  workLog,
  data = {},
  hourlyType = paymentArchiveType.NORMAL
}) => {
  const row = {
    companyId: '',
    hiringCompanyId: '',
    paymentCompanyId: '',
    candidateId: '',
    approvedDate: '',
    paymentCompany: '',
    company: '',
    hiringCompany: '',
    firstName: '',
    lastName: '',
    fullName: '',
    birthday: '',
    bsn: '',
    weekNumber: '',
    date: '',
    payRate: '',
    hours: '',
    hoursType: '',
    percentage: 100,
    hoursName: '',
    travelExpense: '',
    totalKilometer: '',
    totalTravelExpense: '',
    paymentInterval: '',
    amount: '',
    category: '',
    note: '',
    travelHoursPerWeek: '',
    otherExpenses: '',
    otherExpensesUnit: '',
    otherExpensesType: '',
    exchangeHousing: '',
    exchangeHousingInterval: '',
    exchangeOtherExpense: '',
    exchangeOtherExpenseUnit: '',
    deductions: '',
    deductionsInterval: '',
    healthInsuranceDeduction: '',
    healthInsuranceDeductionInterval: '',
    periodVersion: 0,
    units: ''
  }
  if (workLog.company) {
    row.companyId = workLog.company._id
    row.company = workLog.company.name
  }

  if (workLog.hiringCompany) {
    row.hiringCompanyId = workLog.hiringCompany._id
    row.hiringCompany = workLog.hiringCompany.name
  }

  if (workLog.worker) {
    const worker = workLog.worker
    row.candidateId = workLog.worker._id
    row.firstName = worker.firstName
    row.lastName = worker.lastName
    row.fullName = fullNameFormatter(worker)
    row.birthday = toNLDateString(worker.birthday)
    row.bsn = worker.bsn
  }
  let jobOffer = workLog.jobOfferData
  if (workLog.reversedId && workLog.archivedData) {
    const archivedData = workLog.archivedData
    if (archivedData.jobOfferData) {
      jobOffer = archivedData.jobOfferData
    }

    // replace ORPItem
    if (
      data.ORPItem &&
      archivedData.timeSheetData &&
      archivedData.timeSheetData.data &&
      archivedData.timeSheetData.data.length
    ) {
      const timeSheetItems = archivedData.timeSheetData.data
      timeSheetItems.forEach(timeSheetItem => {
        if (timeSheetItem.adjustedWages && timeSheetItem.adjustedWages.length) {
          const newAdjustedWage = timeSheetItem.adjustedWages.find(
            adjustedWage =>
              adjustedWage &&
              adjustedWage.ORPItem &&
              adjustedWage.ORPItem.invoiceLabel &&
              adjustedWage.ORPItem.invoiceLabel === data.ORPItem.invoiceLabel
          )
          if (newAdjustedWage) {
            data.ORPItem = newAdjustedWage.ORPItem
            // todo replace using every to avoid useless loop
          }
        }
      })
    }
  }

  if (jobOffer && jobOffer._id) {
    if (jobOffer.contractData.paymentCompany) {
      row.paymentCompanyId = jobOffer.contractData.paymentCompany._id
      row.paymentCompany = jobOffer.contractData.paymentCompany.name
    }

    row.paymentInterval = jobOffer.paymentInterval

    if (
      (hourlyType === paymentArchiveType.ADJUSTED ||
        hourlyType === paymentArchiveType.IRREGULAR_WORK) &&
      jobOffer.ORPId &&
      data.ORPItem
    ) {
      row.payRate = data.ORPItem.invoiceRate
    } else if (
      hourlyType === paymentArchiveType.GROSS_COMPENSATION ||
      hourlyType === paymentArchiveType.NET_COMPENSATION
    ) {
      row.payRate = 1
    } else {
      row.payRate = jobOffer.payRate
    }

    if (
      hourlyType === paymentArchiveType.GROSS_COMPENSATION ||
      hourlyType === paymentArchiveType.NET_COMPENSATION
    ) {
      row.hourlyWage = 1
    } else {
      row.hourlyWage = jobOffer.hourlyWage
    }

    row.travelExpense = getTravelDistanceExpenseRate(
      jobOffer.travelDistanceExpenseRate
    )
    row.travelHoursPerWeek = jobOffer.travelHoursPerWeek
    row.otherExpenses = jobOffer.otherExpenses
    row.otherExpensesType = jobOffer.otherExpensesType
    row.otherExpensesUnit = jobOffer.otherExpensesUnit
    // ET variables
    row.exchangeHousing = jobOffer.exchangeHousing
    row.exchangeHousingInterval = jobOffer.exchangeHousingInterval
    row.exchangeOtherExpense = jobOffer.exchangeOtherExpense
    row.exchangeOtherExpenseUnit = jobOffer.exchangeOtherExpenseUnit
    row.deductions = jobOffer.deductions
    row.deductionsInterval = jobOffer.deductionsInterval
    row.healthInsuranceDeduction = jobOffer.healthInsuranceDeduction
    row.healthInsuranceDeductionInterval =
      jobOffer.healthInsuranceDeductionInterval
    row.periodVersion = jobOffer.version
  }

  if (workLog.approvalDate) {
    row.approvedDate = toNLDateTimeString(workLog.approvalDate)
  }

  if (data.date) {
    row.date = toNLDateString(data.date)
  }

  row.hoursType = hourlyType
  if (type === workLogType.TIMESHEET) {
    row.weekNumber = workLog.timeSheetData.weekNumber
    if (hourlyType === paymentArchiveType.NORMAL) {
      row.units = data.normalWageHours || 0
    } else if (
      hourlyType === paymentArchiveType.ADJUSTED ||
      hourlyType === paymentArchiveType.IRREGULAR_WORK
    ) {
      row.percentage = data.percentOfAdjustedWage
      row.hoursName = getTimeSheetHoursName(
        data.percentCodeOfAdjustedWage,
        data.percentOfAdjustedWage
      )
      row.units = data.adjustedWageHours || 0
      if (data.ORPItem && jobOffer.ORPId) {
        row.note = data.ORPItem.invoiceLabel
      }
    } else if (
      hourlyType === paymentArchiveType.NET_COMPENSATION ||
      hourlyType === paymentArchiveType.GROSS_COMPENSATION
    ) {
      if (
        data.compensationUnit === compensationUnitType.DAY ||
        data.compensationUnit === compensationUnitType.WEEK_DAY ||
        data.compensationUnit === compensationUnitType.WEEK
      ) {
        row.units = Number(data.compensationAmount)
      }
      if (data.compensationUnit === compensationUnitType.HOUR) {
        row.units = Number(data.compensationAmount) * Number(data.totalHour)
      }
      row.note = data.description
    } else {
      row.units = data.distanceTraveled
      row.totalKilometer = data.distanceTraveled || 0
      row.totalTravelExpense = convertDecimalNumber(
        row.totalKilometer * row.travelExpense
      )
    }
  } else {
    row.category = data.category
    // row.note = data.commentDescription
    row.note = data.category
    row.units = data.amount

    // todo discuss
    row.payRate = 1
    row.hourlyWage = 1
  }
  return row
}

const generateWorkLogArchiveRows = workLogs => {
  const rows = []
  workLogs.forEach(workLog => {
    // exclude freelancer
    // freelancers are not included in payroll
    if (workLog.worker && !workLog.worker.freelancer) {
      if (workLog.type === workLogType.TIMESHEET) {
        let fixedItems
        let workedStartDate
        let isUsedWeekItem = false
        if (
          workLog.jobOfferData &&
          workLog.jobOfferData.ORPId &&
          workLog.jobOfferData.ORPData &&
          workLog.jobOfferData.ORPData.fixedCompensationItems &&
          workLog.jobOfferData.ORPData.fixedCompensationItems.length
        ) {
          fixedItems = workLog.jobOfferData.ORPData.fixedCompensationItems
        }
        workLog.timeSheetData.data.forEach(timesheet => {
          let totalHour = 0
          if (timesheet.normalWageHours) {
            totalHour += Number(timesheet.normalWageHours)
            rows.push(
              generateWorkLogArchiveRow({
                workLog,
                data: timesheet
              })
            )
          }

          if (timesheet.distanceTraveled) {
            rows.push(
              generateWorkLogArchiveRow({
                workLog,
                data: timesheet,
                hourlyType: paymentArchiveType.KM_VERGOEDING
              })
            )
          }

          if (timesheet.adjustedWages.length) {
            timesheet.adjustedWages.forEach(adjustedWage => {
              totalHour += Number(adjustedWage.adjustedWageHours)
              if (
                adjustedWage.ORPItem &&
                adjustedWage.ORPItem.overWorkType &&
                adjustedWage.ORPItem.overWorkType ===
                  ORPWorkedHoursType.IRREGULAR_WORKING_HOURS
              ) {
                rows.push(
                  generateWorkLogArchiveRow({
                    workLog,
                    data: { ...timesheet, ...adjustedWage },
                    hourlyType: paymentArchiveType.IRREGULAR_WORK
                  })
                )
              } else {
                rows.push(
                  generateWorkLogArchiveRow({
                    workLog,
                    data: { ...timesheet, ...adjustedWage },
                    hourlyType: paymentArchiveType.ADJUSTED
                  })
                )
              }
            })
          }

          if (
            fixedItems &&
            (timesheet.normalWageHours ||
              (timesheet.adjustedWages && timesheet.adjustedWages.length))
          ) {
            if (!workedStartDate) {
              workedStartDate = timesheet.date
            }
            fixedItems.forEach(fixedItem => {
              if (
                fixedItem.compensationUnit === compensationUnitType.DAY ||
                (fixedItem.compensationUnit === compensationUnitType.WEEK_DAY &&
                  convertDayString(timesheet.date) !== dayListType.Saturday &&
                  convertDayString(timesheet.date) !== dayListType.Sunday)
              ) {
                rows.push(
                  generateWorkLogArchiveRow({
                    workLog,
                    data: { ...fixedItem, date: timesheet.date },
                    hourlyType: getCompensationType(fixedItem)
                  })
                )
              }

              if (fixedItem.compensationUnit === compensationUnitType.HOUR) {
                rows.push(
                  generateWorkLogArchiveRow({
                    workLog,
                    data: { ...fixedItem, date: timesheet.date, totalHour },
                    hourlyType: getCompensationType(fixedItem)
                  })
                )
              }
              if (
                fixedItem.compensationUnit === compensationUnitType.WEEK &&
                !isUsedWeekItem
              ) {
                rows.push(
                  generateWorkLogArchiveRow({
                    workLog,
                    data: { ...fixedItem, date: workedStartDate },
                    hourlyType: getCompensationType(fixedItem)
                  })
                )
              }
            })
            isUsedWeekItem = true
          }
        })
      } else {
        rows.push(
          generateWorkLogArchiveRow({
            type: workLogType.EXPENSE,
            workLog,
            data: workLog.expenseData,
            hourlyType: paymentArchiveType.EXPENSE
          })
        )
      }
    }
  })
  return rows
}

const generateWorkLogCSVRows = archives => {
  const groupRows = []
  archives.forEach(archive => {
    if (archive.hoursType !== paymentArchiveType.EXPENSE) {
      let sameArchive
      if (
        archive.hoursType === paymentArchiveType.ADJUSTED ||
        archive.hoursType === paymentArchiveType.IRREGULAR_WORK ||
        archive.hoursType === paymentArchiveType.GROSS_COMPENSATION ||
        archive.hoursType === paymentArchiveType.NET_COMPENSATION
      ) {
        sameArchive = groupRows.find(
          item =>
            item.hoursType === paymentArchiveType.ADJUSTED &&
            item.date === archive.date &&
            ((item.note && item.note === archive.note) || !item.note) &&
            isEqualIDs(item.hiringCompanyId, archive.hiringCompanyId) &&
            isEqualIDs(item.candidateId, archive.candidateId) &&
            isEqualIDs(item.paymentCompanyId, archive.paymentCompanyId) &&
            isEqualIDs(item.companyId, archive.companyId)
        )
      } else {
        sameArchive = groupRows.find(
          item =>
            item.hoursType === archive.hoursType &&
            item.date === archive.date &&
            isEqualIDs(item.hiringCompanyId, archive.hiringCompanyId) &&
            isEqualIDs(item.candidateId, archive.candidateId) &&
            isEqualIDs(item.paymentCompanyId, archive.paymentCompanyId) &&
            isEqualIDs(item.companyId, archive.companyId)
        )
      }
      if (sameArchive) {
        sameArchive.units += Number(archive.units)
      } else {
        groupRows.push({
          ...archive
        })
      }
    } else {
      groupRows.push({
        ...archive
      })
    }
  })
  return groupRows
}

const getWorkLogsToInvoiceQuery = query => {
  return [
    {
      $addFields: {
        weekNumber: {
          $cond: {
            if: { $eq: ['$type', workLogType.TIMESHEET] },
            then: '$timeSheetData.weekNumber',
            else: '$expenseData.weekNumber'
          }
        },
        isMonthly: {
          $eq: ['$timeSheetData.isMonthly', true]
        },
        month: {
          $cond: {
            if: { $eq: ['$type', workLogType.TIMESHEET] },
            then: '$timeSheetData.month',
            else: '$expenseData.month'
          }
        },
        year: {
          $cond: {
            if: { $eq: ['$type', workLogType.TIMESHEET] },
            then: '$timeSheetData.year',
            else: '$expenseData.year'
          }
        }
      }
    },
    {
      $match: query
    }
  ]
}

const generateWorkLogAmount = (workLogAmount, type) => {
  if (workLogAmount.items && workLogAmount.items.length) {
    workLogAmount.items.forEach(workLog => {
      const { timeSheetItems, expenseItems } = generateInvoiceItems(
        [workLog],
        type
      )
      const items = [...timeSheetItems, ...expenseItems]
      workLog.totalInvoiceAmount = 0
      items.forEach(item => {
        workLog.totalInvoiceAmount += item.totalAmount
      })
    })

    if (workLogAmount.items && workLogAmount.items.length) {
      if (type === invoiceType.COMPANY_TO_HIRING_COMPANY) {
        workLogAmount.items = workLogAmount.items.filter(
          item =>
            item.totalInvoiceAmount &&
            isEqualIDs(item.companyId, item.paymentCompanyId)
        )
      } else if (type === invoiceType.COMPANY_TO_PAYMENT_COMPANY) {
        workLogAmount.items = workLogAmount.items.filter(
          item =>
            item.totalInvoiceAmount &&
            !isEqualIDs(item.companyId, item.paymentCompanyId)
        )
      } else {
        workLogAmount.items = workLogAmount.items.filter(
          item => item.totalInvoiceAmount
        )
      }
    }

    if (workLogAmount.items && workLogAmount.items.length) {
      workLogAmount.amount = workLogAmount.items.length
    } else {
      workLogAmount.amount = 0
      workLogAmount.items = []
    }
  }
  return workLogAmount
}

const checkSubmitWorkLog = (workLog, jobOffer = {}) => {
  if (jobOffer && jobOffer._id) {
    const startDate = new Date(new Date(jobOffer.startDate).toDateString())
    let endDate = new Date(new Date(jobOffer.endDate).toDateString())
    if (startDate > endDate) {
      endDate = new Date('9999-12-31') // hacking solution
    }

    if (
      workLog.timeSheetData &&
      workLog.timeSheetData.data &&
      workLog.timeSheetData.data.length
    ) {
      const items = workLog.timeSheetData.data.filter(item => {
        if (
          new Date(new Date(item.date).toDateString()) <
            new Date(startDate.toDateString()) ||
          new Date(new Date(item.date).toDateString()) >
            new Date(endDate.toDateString())
        ) {
          const adjustedWageHours = item.adjustedWages.reduce(
            (initial, wage) => {
              return initial + Number(wage.adjustedWageHours)
            },
            0
          )
          return Number(item.normalWageHours) || adjustedWageHours
        }
      })
      return !items.length
    }
  }
  return true
}

const getReverseTimeSheetData = req => {
  if (
    req.timeSheetData &&
    req.timeSheetData.data &&
    req.timeSheetData.data.length
  ) {
    req.timeSheetData.data.forEach(item => {
      item.normalWageHours = -item.normalWageHours
      item.distanceTraveled = -item.distanceTraveled
      if (item.adjustedWages.length) {
        item.adjustedWages.forEach(wage => {
          wage.adjustedWageHours = -wage.adjustedWageHours
        })
      }
    })
    req.timeSheetData.totalNormalWageHours = -req.timeSheetData
      .totalNormalWageHours
    req.timeSheetData.totalAdjustedWageHours = -req.timeSheetData
      .totalAdjustedWageHours
    req.timeSheetData.totalDistanceTraveled = -req.timeSheetData
      .totalDistanceTraveled
    req.timeSheetData.totalHours = -req.timeSheetData.totalHours
  }
  req.status = workLogStateType.APPROVED
  req.approvalDate = new Date()
  req.reversedAt = new Date()
  req.reversedId = req._id

  // remove unnecessary fields
  delete req.invoiceNumber
  delete req.brokerInvoiceNumber
  delete req.processedAt
  delete req.createdAt
  delete req.updatedAt
  delete req.freelancerInvoiceNumber
  delete req.logs
  delete req._id

  return req
}

const getFilteredWorkLogByLog = (workLog, user) => {
  if (workLog.logs && workLog.logs.length) {
    if (user.role === roleType.ADMIN) {
      return workLog
    }
    const isOwnCompany = isEqualIDs(user.companyId, workLog.companyId)
    const isOwnPaymentCompany = isEqualIDs(
      user.companyId,
      workLog.paymentCompanyId
    )
    if (
      user.role === roleType.MANAGER &&
      (isOwnCompany || isOwnPaymentCompany)
    ) {
      if (isOwnPaymentCompany) {
        return workLog
      }
      if (isOwnCompany) {
        workLog.logs = workLog.logs.filter(
          log =>
            log.title !== workLogStateType.PROCESSED ||
            log.title !== workLogStateType.MARK_PROCESSED
        )
        return workLog
      }
    }
    workLog.logs = workLog.logs.filter(
      log => log.visibility !== visibilityType.IC_PC_MANAGERS
    )
    return workLog
  }
  return workLog
}

const getArchiveSearchQuery = (req, isDaemon) => {
  let condition = {
    status: workLogStateType.APPROVED
  }

  if (isDaemon) {
    condition = {
      ...condition,
      'timeSheetData.isMonthly': req.monthly ? true : { $ne: true }
    }
  } else {
    if (req.companyId) {
      condition.paymentCompanyId = new ObjectID(req.companyId)
    }
    if (req.intermediaryCompanyId) {
      condition.companyId = new ObjectID(req.intermediaryCompanyId)
    }
    if (req.hiringCompanyId) {
      condition.hiringCompanyId = new ObjectID(req.hiringCompanyId)
    }
    if (req.payrollType) {
      const isMonthly = req.payrollType !== paymentIntervalTypes[0]
      condition = {
        ...condition,
        'timeSheetData.isMonthly': isMonthly ? true : { $ne: true }
      }
      if (isMonthly && req.month) {
        condition.month = req.month
      }
      if (!isMonthly && req.fromWeek) {
        condition.weekNumber = { $gte: Number(req.fromWeek) }
        if (req.toWeek) {
          delete condition.weekNumber
          condition.$and = [
            { weekNumber: { $gte: Number(req.fromWeek) } },
            { weekNumber: { $lte: Number(req.toWeek) } }
          ]
        }
      }
    }
    if (req.year) {
      condition.year = `${req.year}`
    }
    if (req.types) {
      condition.type = { $in: req.types }
    }
  }

  return condition
}

const getWorkLogCommonQuery = ({
  req,
  user,
  type,
  condition = {},
  statuses = [workLogStateType.NOT_SUBMITTED, workLogStateType.DECLINED]
}) => {
  condition._id = req.workLogId
  condition.status = { $in: statuses }
  if (user.role === roleType.MANAGER) {
    if (type === companyType.PAYMENT) {
      condition.paymentCompanyId = new ObjectID(req.companyId)
    } else {
      condition.$or = [
        {
          companyId: req.companyId
        },
        {
          hiringCompanyId: req.companyId
        }
      ]
    }
  } else if (user.role === roleType.WORKER) {
    condition.companyId = req.companyId
    condition.workerId = user._id
  }
  return condition
}

const processWorkLogArchives = archives => {
  return archives.map(archive => {
    archive.items = generateWorkLogCSVRows(archive.items)
    return archive
  })
}

const checkWorkLogTypes = value => {
  const invalidType = value.find(type => !workLogTypes.includes(type))
  return !invalidType
}

const serializeWorkLogArchiveData = req => {
  if (req.payrollType === paymentIntervalTypes[0]) {
    req.month = null
  } else if (req.payrollType === paymentIntervalTypes[1]) {
    req.fromWeek = null
    req.toWeek = null
    req.isWeekSelect = false
  } else {
    req.month = null
    req.fromWeek = null
    req.toWeek = null
    req.isWeekSelect = false
  }
  if (!req.isWeekSelect) {
    req.fromWeek = null
    req.toWeek = null
  }
  return req
}

const getWorkLogYearWeek = workLog => {
  let year = ''
  let weekNumber = ''
  if (workLog.type === workLogType.TIMESHEET) {
    weekNumber =
      workLog.timeSheetData.weekNumber < 10
        ? `0${workLog.timeSheetData.weekNumber}`
        : workLog.timeSheetData.weekNumber || ''
    if (
      workLog.timeSheetData &&
      workLog.timeSheetData.data &&
      workLog.timeSheetData.data.length
    ) {
      year = new Date(workLog.timeSheetData.data[0].date)
        .getFullYear()
        .toString()
    }
  } else {
    if (workLog.expenseData.weekNumber) {
      weekNumber =
        workLog.expenseData.weekNumber < 10
          ? `0${workLog.expenseData.weekNumber}`
          : workLog.expenseData.weekNumber || ''
    }
    if (workLog.expenseData.date) {
      year = new Date(workLog.expenseData.date).getFullYear().toString()
    }
  }

  return year ? `${year}-${weekNumber}` : weekNumber
}

const generateTimeSheetRows = (user, workLog, index) => {
  if (workLog.type === workLogType.EXPENSE) {
    workLog.link = `${workLog.link}/edit/${workLog._id}`
  } else {
    workLog.link = `${workLog.link}/${workLog._id}`
  }
  const initialItem = {
    TimesheetId: workLog._id,
    'Type of timesheet': workLog.type.toUpperCase(),
    Status: convertStatus(workLog.status),
    Year: workLog.year,
    Week: workLog.weekNumber,
    InvoiceNumber: workLog.invoiceNumber || 0,
    SubmitDate: convertExcelDateFormat(workLog.submitDate),
    ApprovalDate: convertExcelDateFormat(workLog.approvalDate),
    ApprovalUserName: getUserName(workLog.logs, workLogStateType.APPROVED),
    ProcessedDate: convertExcelDateFormat(workLog.processedAt),
    HiringCompanyName: workLog.hiringCompany || '',
    IntermediaryCompanyName: workLog.company || '',
    CandidateName: workLog.worker,
    CandidateID: workLog.workerId,
    JobOfferID: workLog.jobOfferId,
    Date: null,
    ProjectName: '',
    Hours: null,
    ExpenseAmount:
      workLog.type === workLogType.EXPENSE ? workLog.expenseData.amount : null,
    Category: '',
    OvertimePercentage: null,
    OvertimeInvoiceRate: null,
    'Timesheet Link': { url: workLog.link, index: index + 1 }
  }

  let projectName = ''
  if (workLog.type === workLogType.EXPENSE) {
    projectName =
      workLog.projects && workLog.projects[0] && workLog.expenseData.projectId
        ? workLog.projects[0].name
        : ''
    return {
      ...initialItem,
      Category: convertStatus(workLog.expenseData.category),
      ProjectName: projectName,
      Date: new Date(workLog.expenseData.date)
    }
  }
  const items = []
  workLog.timeSheetData.data.forEach(item => {
    const exportItem = {
      ...initialItem,
      Date: new Date(item.date),
      ProjectName: projectName
    }
    if (item.projectId) {
      const project = workLog.projects.find(itm => itm._id === item.projectId)
      projectName = project ? project.name : ''
    }
    // normal wage hours
    items.push({
      ...exportItem,
      Hours: item.normalWageHours,
      Category: convertStatus('normal'),
      OvertimePercentage: 100
    })

    // adjusted wage hours
    if (item.adjustedWages && item.adjustedWages.length) {
      item.adjustedWages.forEach(adjustedWage => {
        if (adjustedWage.ORPItem && adjustedWage.ORPItem._id) {
          items.push({
            ...exportItem,
            Hours: adjustedWage.adjustedWageHours,
            Category: adjustedWage.ORPItem.invoiceLabel,
            OvertimeInvoiceRate: adjustedWage.ORPItem.invoiceRate,
            OvertimePercentage: adjustedWage.ORPItem.hourlyWageSurcharge
          })
        } else {
          items.push({
            ...exportItem,
            OvertimePercentage: adjustedWage.percentOfAdjustedWage,
            Hours: adjustedWage.adjustedWageHours,
            Category: convertStatus('adjusted')
          })
        }
      })
    }
  })
  return items
}

const getTimesheetDataToExcel = (rows, user, isPayment) => {
  let json = []

  rows.forEach((item, index) => {
    item.link = `${frontendUrl}/${user.role}/dashboard/worklog/${
      isPayment ? `payment/${item.type}` : `${item.type}`
    }`
    if (user.role === roleType.WORKER) {
      const row = {
        'Week Number': item.week,
        'Normal Hours': Number(item.timeSheetData.totalNormalWageHours),
        'Overtime Hours': Number(
          item.timeSheetData.totalAdjustedWageHours || 0
        ),
        'Travel Kms': item.timeSheetData.totalDistanceTraveled || 0,
        Status: convertStatus(item.status),
        'Create Dtm': convertExcelDateFormat(item.createdAt),
        'Update Dtm': convertExcelDateFormat(item.updatedAt),
        'Submitted By': getUserName(item.logs, workLogStateType.SUBMITTED),
        'Submit Dtm': convertExcelDateFormat(item.submitDate),
        'Approved By': getUserName(item.logs, workLogStateType.APPROVED),
        'Approve Dtm': convertExcelDateFormat(item.approvalDate),
        'Timesheet Link': `${item.link}/${item._id}`
      }
      json.push(row)
    } else {
      const timesheets = generateTimeSheetRows(user, item, index)
      if (item.type === workLogType.EXPENSE) {
        json.push(timesheets)
      } else {
        json = [...json, ...timesheets]
      }
    }
  })
  return json
}

module.exports = {
  workLogCSVColumns,
  isExistedTimeSheet,
  clearTimeSheetData,
  canGenerateTimeSheets,
  generateWeekDates,
  generateWeeksDates,
  serializeWorkLogData,
  generateWorkLogArchiveRow,
  generateWorkLogArchiveRows,
  generateWorkLogCSVRows,
  generateWorkLogAmount,
  getWorkLogsToInvoiceQuery,
  checkSubmitWorkLog,
  getReverseTimeSheetData,
  getFilteredWorkLogByLog,
  getArchiveSearchQuery,
  getWorkLogCommonQuery,
  processWorkLogArchives,
  checkWorkLogTypes,
  serializeWorkLogArchiveData,
  getWorkLogYearWeek,
  getTimesheetDataToExcel
}
