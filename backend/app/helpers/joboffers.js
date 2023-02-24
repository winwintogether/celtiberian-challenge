const fs = require('fs')
const fsExtra = require('fs-extra')
const path = require('path')
const uuid = require('uuid')
const { sortBy } = require('lodash')
const {
  toNLDateString,
  toNLDateTimeString,
  getHonorificTitle,
  fullNameFormatter,
  isEqualIDs,
  termOfPaymentFormatter,
  getDurationDate,
  fullAddressFormatter,
  getTravelDistanceExpenseRate,
  expenseUnitFormatter,
  toStandardDateString,
  convertCurrencyString,
  convertExcelDateFormat,
  convertStatus
} = require('./utils')
const {
  generateCompanyContract,
  generateTaxStatement,
  generateWorkerContract
} = require('../contracts')
const {
  offerStateType,
  discountTaxType,
  roleType,
  offerType,
  companyAllowType,
  visibilityType,
  contractVersionType,
  languageType,
  termsOfPaymentType,
  viewOfferType,
  currencyType,
  pensionType
} = require('../../config/types')
const {
  euCountries,
  europeanFreeTradeAssociation,
  freelancerData: freelancerJson,
  termsOfPayments,
  colaValues,
  deductionValues,
  prefinancingPercentages,
  countries
} = require('../../config/constants')
const { frontendUrl } = require('../../config/vars')

const isAdmin = user => user.role === roleType.ADMIN

const isManager = (user, jobOffer) =>
  user.role === roleType.MANAGER &&
  isEqualIDs(jobOffer.companyId, user.companyId)

const isHiringManager = (user, jobOffer) =>
  user.role === roleType.MANAGER &&
  isEqualIDs(jobOffer.hiringCompanyId, user.companyId)

const isWorker = (user, jobOffer) => isEqualIDs(jobOffer.workerId, user._id)

const isBrokerCompany = (companyId, hiringCompanyId, paymentCompanyId) => {
  return !!(
    paymentCompanyId &&
    !isEqualIDs(paymentCompanyId, companyId) &&
    !isEqualIDs(companyId, hiringCompanyId)
  )
}

const isFreelancerContract = contractType => {
  return (
    contractType &&
    contractType.version === contractVersionType.TRADITIONAL &&
    contractType.companyContractTemplatePath.includes('freelancer')
  )
}

const isOfflineContract = contractType => {
  return (
    contractType &&
    contractType.version === contractVersionType.TRADITIONAL &&
    contractType.companyContractTemplatePath.includes('offline')
  )
}

const isDocusignContract = contractType => {
  return contractType && contractType.version === contractVersionType.DOCUSIGN
}

const setContractStatus = (data, jobOffer, isWorkerContract = true) => {
  const req = {}
  const offerStatus = isWorkerContract
    ? jobOffer.intermediaryStatus
    : jobOffer.status
  if (new Date(jobOffer.startDate) > new Date()) {
    req.status1 = offerStateType.NOT_ACTIVE
  } else if (jobOffer.endDate && new Date(jobOffer.endDate) < new Date()) {
    req.status1 = offerStateType.EXPIRED
    if (
      offerStatus === offerStateType.ACTIVE ||
      offerStatus === offerStateType.NOT_ACTIVE
    ) {
      req.status2 = offerStateType.EXPIRED
    }
  } else {
    req.status1 = offerStateType.ACTIVE
    if (offerStatus === offerStateType.NOT_ACTIVE) {
      req.status2 = offerStateType.ACTIVE
    }
  }
  if (
    isWorkerContract &&
    isEqualIDs(jobOffer.companyId, jobOffer.hiringCompanyId)
  ) {
    req.status2 = req.status1
  }

  if (req.status1) {
    if (isWorkerContract) {
      data.status = req.status1
    } else {
      data.intermediaryStatus = req.status1
    }
  }
  if (req.status2) {
    if (isWorkerContract) {
      data.intermediaryStatus = req.status2
    } else {
      data.status = req.status2
    }
  }
  return data
}

const getJobOfferDeleteCode = status => {
  switch (status) {
    case offerStateType.ACTIVE:
      return 'HAS_ACTIVE_OFFER'
    case offerStateType.COMPLETED:
      return 'HAS_COMPLETED_OFFER'
    case offerStateType.PENDING:
      return 'HAS_PENDING_OFFER'
    case offerStateType.OPEN:
      return 'AVAILABLE'
  }
  return 'NOT_AVAILABLE'
}

const getAddress = address => {
  return {
    city: address.city,
    country: address.country || '',
    fullAddress:
      address.country === 'Netherlands'
        ? `${address.street} ${address.houseNumber} ${address.houseNumberAddition}`
        : `${address.addressLine1} ${address.addressLine2}`,
    postalAddress: `${address.postalCode} ${address.city} ${address.state} ${address.country}`
  }
}

const getContractName = (signData, type = 'worker') => {
  const { worker, paymentCompany, hiringCompany } = signData

  let name = ''
  if (type === 'worker') {
    name = `${paymentCompany.name}-${fullNameFormatter(worker)}-${
      hiringCompany.name
    }`
  }
  if (type === 'company') {
    name = `${paymentCompany.name}-${hiringCompany.name}-${fullNameFormatter(
      worker
    )}`
  }
  name = name
    .split(' ')
    .join('-')
    .toLocaleLowerCase()
  if (type === 'company') {
    name = `Inleen-${name}`
  }
  return `${name}-${new Date().toISOString().slice(0, 10)}.pdf`
}

const getInitialSignData = () => {
  return {
    company: null,
    companyOwner: null,
    paymentCompany: null,
    hiringCompany: null,
    hiringCompanyOwner: null,
    worker: null,
    manager: null,
    paymentManager: null,
    hiringManager: null,
    job: null,
    contractType: null,
    collectiveAgreement: null,
    salaryTable: null,
    salaryTableJob: null,
    brokerCompany: null,
    createdAt: null
  }
}

const getFreelancerData = (freelancer, isPDF) => {
  const data = {
    FL_DISCIPLINE: freelancer.FL_DISCIPLINE || '',
    HC_DISCIPLINE: freelancer.HC_DISCIPLINE || '',
    UITVOERING_MPC: freelancer.UITVOERING_MPC || '',
    VOG_OPTIONAL: freelancer.VOG_OPTIONAL || false,
    KEURMERK_OPTIONAL: freelancer.KEURMERK_OPTIONAL || false,
    BEROEPSREGISTER_OPTIONAL: freelancer.BEROEPSREGISTER_OPTIONAL || false,
    WAADI_OPTIONAL: freelancer.WAADI_OPTIONAL || false,
    INSURANCE_MIN_INCIDENT_COVER_AMOUNT:
      freelancer.INSURANCE_MIN_INCIDENT_COVER_AMOUNT || 0,
    INSURANCE_MIN_YEARLY_COVER_AMOUNT:
      freelancer.INSURANCE_MIN_YEARLY_COVER_AMOUNT || 0,
    INSURANCE_PERIODIEK_MPC: freelancer.INSURANCE_PERIODIEK_MPC || 'Eenmalig',
    VEILIGHEID_OPTIONAL: freelancer.VEILIGHEID_OPTIONAL || false,
    MANDATORY: freelancer.MANDATORY || false,
    DAY_1: freelancer.DAY_1 || 0,
    DAY_2: freelancer.DAY_2 || 0,
    CONCURRENTIEBEDING: freelancer.CONCURRENTIEBEDING || '',
    INTELLECTUEEL_EIGENDOM: freelancer.INTELLECTUEEL_EIGENDOM || '',
    AANSPRAKELIJKHEID_OPDRACHTGEVER:
      freelancer.AANSPRAKELIJKHEID_OPDRACHTGEVER || '',
    SCREENING_OPTIONAL: freelancer.SCREENING_OPTIONAL || false,
    SELECTION_OPTIONAL: freelancer.SELECTION_OPTIONAL || false,
    FACTUUR_CONTROLE_OPTIONAL: freelancer.FACTUUR_CONTROLE_OPTIONAL || false,
    FACTUUR_CONTROLE_AANLEVERING_OPTIONAL:
      freelancer.FACTUUR_CONTROLE_AANLEVERING_OPTIONAL || false,
    OVEREENKOMST_BEGELEIDING_OPTIONAL:
      freelancer.OVEREENKOMST_BEGELEIDING_OPTIONAL || false,
    BEMIDDELING_OPTIONAL: freelancer.BEMIDDELING_OPTIONAL || false,
    OVEREENKOMST_OPTIONAL: freelancer.OVEREENKOMST_OPTIONAL || false,
    BEMIDDELING_COMP_AMOUNT: freelancer.BEMIDDELING_COMP_AMOUNT || 0,
    VAT_INCLUDED_MPC_2: freelancer.VAT_INCLUDED_MPC_2 || 'Inclusief',
    INVOICE_EXP_DAYS: freelancer.INVOICE_EXP_DAYS || 0,
    VOORFINANCIERING_OPTIONAL: freelancer.VOORFINANCIERING_OPTIONAL || false,
    VOORFINANCIERING_AMOUNT_DAYS_1:
      freelancer.VOORFINANCIERING_AMOUNT_DAYS_1 || 0,
    VOORFINANCIERING_AMOUNT_DAYS_2:
      freelancer.VOORFINANCIERING_AMOUNT_DAYS_2 || 0,
    VOORFINANCIERING_AMOUNT_DAYS_3:
      freelancer.VOORFINANCIERING_AMOUNT_DAYS_3 || 0,
    VOORFINANCIERING_AMOUNT: freelancer.VOORFINANCIERING_AMOUNT || 0,
    VOORFINANCIERING_VAT_INCLUDED:
      freelancer.VOORFINANCIERING_VAT_INCLUDED || 'Inclusief',
    AANSPRAKELIJKHEID_BEMIDDELAAR:
      freelancer.AANSPRAKELIJKHEID_BEMIDDELAAR || '',
    GEHEIMHOUDING: freelancer.GEHEIMHOUDING || '',
    PERSOONSGEGEVENS: freelancer.PERSOONSGEGEVENS || '',
    BELASTINGEN: freelancer.BELASTINGEN || '',
    VRIJWARING_EN_VERREKENING: freelancer.VRIJWARING_EN_VERREKENING || '',
    BIJLAGE_1A_TAAKOMSCHRIJVING: freelancer.BIJLAGE_1A_TAAKOMSCHRIJVING || '',
    BIJLAGE_1A_PROJECTOMSCHRIJVING:
      freelancer.BIJLAGE_1A_PROJECTOMSCHRIJVING || '',
    BIJLAGE_1A_PROJECTNAAM: freelancer.BIJLAGE_1A_PROJECTNAAM || '',
    BIJLAGE_STARTDATE: freelancer.BIJLAGE_STARTDATE || null,
    BIJLAGE_1A_CONTRACT_DURATION: freelancer.BIJLAGE_1A_CONTRACT_DURATION || 0,
    BIJLAGE_1A_CONTRACT_DURATION_TYPE:
      freelancer.BIJLAGE_1A_CONTRACT_DURATION_TYPE || 'days',
    BIJLAGE_1A_LOCATIE: freelancer.BIJLAGE_1A_LOCATIE || '',
    BIJLAGE_2_VAT_INCLUDED: freelancer.BIJLAGE_2_VAT_INCLUDED || 'Inclusief',
    BIJLAGE_2_HOURLY_RATE_FL_PC: freelancer.BIJLAGE_2_HOURLY_RATE_FL_PC || 0,
    BIJLAGE_2_KOSTENVERGOEDINGEN: freelancer.BIJLAGE_2_KOSTENVERGOEDINGEN || 0,
    BIJLAGE_2_VERGOEDINGEN_BETALINGSTERMIJN_MPC:
      freelancer.BIJLAGE_2_VERGOEDINGEN_BETALINGSTERMIJN_MPC ||
      termsOfPaymentType['7_DAYS'],
    BIJLAGE_2_HOURS_PER_WEEK: freelancer.BIJLAGE_2_HOURS_PER_WEEK || 0,
    HULPMIDDEL_OMSCHRIJVING: freelancer.HULPMIDDEL_OMSCHRIJVING || '',
    BIJLAGE_2_HULPMIDDEL_VERGOEDING:
      freelancer.BIJLAGE_2_HULPMIDDEL_VERGOEDING || 0,
    BIJLAGE_2_HULPMIDDELEN_BETALINGSTERMIJN_MPC:
      freelancer.BIJLAGE_2_HULPMIDDELEN_BETALINGSTERMIJN_MPC ||
      termsOfPaymentType['7_DAYS'],
    BIJLAGE_2_INKOOP_NUMMER: freelancer.BIJLAGE_2_INKOOP_NUMMER || 0,
    BIJLAGE_3_HOURLY_RATE_PC_HC: freelancer.BIJLAGE_3_HOURLY_RATE_PC_HC || 0,
    BIJLAGE_3_BETALINGSTERMIJN:
      freelancer.BIJLAGE_3_BETALINGSTERMIJN || termsOfPaymentType['7_DAYS'],
    BIJLAGE_3_HOURS_PER_WEEK: freelancer.BIJLAGE_3_HOURS_PER_WEEK || 0,
    BIJLAGE_3_INKOOP_NUMMER: freelancer.BIJLAGE_3_INKOOP_NUMMER || 0,
    BIJLAGE_3_UITWERKING_SCREENING:
      freelancer.BIJLAGE_3_UITWERKING_SCREENING || ''
  }
  return isPDF
    ? {
        ...data,
        BIJLAGE_STARTDATE: toNLDateString(freelancer.BIJLAGE_STARTDATE),
        BIJLAGE_1A_CONTRACT_DURATION:
          termOfPaymentFormatter(
            `${freelancer.BIJLAGE_1A_CONTRACT_DURATION}_${freelancer.BIJLAGE_1A_CONTRACT_DURATION_TYPE}`
          ) || '',
        BIJLAGE_ENDDATE: toNLDateString(
          getDurationDate({
            date: freelancer.BIJLAGE_STARTDATE,
            duration: freelancer.BIJLAGE_1A_CONTRACT_DURATION,
            type: freelancer.BIJLAGE_1A_CONTRACT_DURATION_TYPE
          })
        ),
        BIJLAGE_2_VERGOEDINGEN_BETALINGSTERMIJN_MPC: termOfPaymentFormatter(
          freelancer.BIJLAGE_2_VERGOEDINGEN_BETALINGSTERMIJN_MPC
        ),
        BIJLAGE_2_HULPMIDDELEN_BETALINGSTERMIJN_MPC: termOfPaymentFormatter(
          freelancer.BIJLAGE_2_HULPMIDDELEN_BETALINGSTERMIJN_MPC
        ),
        BIJLAGE_3_BETALINGSTERMIJN: termOfPaymentFormatter(
          freelancer.BIJLAGE_3_BETALINGSTERMIJN
        )
      }
    : data
}

const generateJobOfferData = (req, signData, isReviewRequired = false) => {
  const replaceResidentialAddress = data => {
    if (data && data.permanentAddress) {
      const permanentAddress = data.permanentAddress
      data.country = permanentAddress.country
      data.city = permanentAddress.city
      data.houseNumber = permanentAddress.houseNumber
      data.houseNumberAddition = permanentAddress.houseNumberAddition
      data.addressLine1 = permanentAddress.addressLine1
      data.addressLine2 = permanentAddress.addressLine2
      data.postalCode = permanentAddress.postalCode
      data.state = permanentAddress.state
      data.street = permanentAddress.street
    }
    return data
  }

  signData.worker = replaceResidentialAddress(signData.worker)
  signData.manager = replaceResidentialAddress(signData.manager)
  signData.paymentManager = replaceResidentialAddress(signData.paymentManager)
  signData.hiringManager = replaceResidentialAddress(signData.hiringManager)
  signData.companyOwner = replaceResidentialAddress(signData.companyOwner)
  signData.hiringCompanyOwner = replaceResidentialAddress(
    signData.hiringCompanyOwner
  )
  const data = {
    status: isReviewRequired
      ? offerStateType.IN_REVIEW
      : offerStateType.PENDING,
    intermediaryStatus: isReviewRequired
      ? offerStateType.IN_REVIEW
      : offerStateType.PENDING,
    brokerCompanyId: req.brokerCompanyId || null,
    startDate: req.startDate,
    endDate: req.endDate,
    contractTypeId: req.contractTypeId,
    'contractData.worker': signData.worker,
    'contractData.manager': signData.manager,
    'contractData.paymentManager': signData.paymentManager,
    'contractData.hiringManager': signData.hiringManager,
    'contractData.company': signData.company,
    'contractData.companyOwner': signData.companyOwner,
    'contractData.paymentCompany': signData.paymentCompany,
    'contractData.hiringCompany': signData.hiringCompany,
    'contractData.brokerCompany': signData.brokerCompany,
    'contractData.hiringCompanyOwner': signData.hiringCompanyOwner,
    'contractData.job': signData.job,
    'contractData.contractType': signData.contractType,
    'contractData.collectiveAgreement': signData.collectiveAgreement,
    'contractData.salaryTable': signData.salaryTable,
    'contractData.salaryTableJob': signData.salaryTableJob,
    periodVariables: [
      {
        currency: req.currency,
        completionDate: req.completionDate,
        applyCaoSubstantiation: req.applyCaoSubstantiation,
        collectiveAgreementId: req.collectiveAgreementId,
        customCao: req.customCao,
        salaryTableId: req.salaryTableId,
        salaryTableJobId: req.salaryTableJobId,
        payscale: req.payscale,
        hoursInWorkweek: req.hoursInWorkweek,
        periodical: req.periodical,
        advPerc: req.advPerc,
        ORPId: req.ORPId || null,
        wage: req.wage,
        hourlyWage: req.hourlyWage,
        rate: req.rate,
        hiringCompanyAcceptsWithoutSigning:
          req.hiringCompanyAcceptsWithoutSigning,
        workerAcceptsWithoutSigning: req.workerAcceptsWithoutSigning,
        payRate: req.payRate,
        termOfPayment: req.termOfPayment || termsOfPaymentType['7_DAYS'],
        travelDistanceExpenseRate: req.travelDistanceExpenseRate,
        directJobTitle: req.directJobTitle,
        travelHoursPerWeek: req.travelHoursPerWeek,
        otherExpenses: req.otherExpenses,
        otherExpensesType: req.otherExpensesType,
        otherExpensesUnit: req.otherExpensesUnit,
        travelDistanceExpenseForOneWay: req.travelDistanceExpenseForOneWay,
        substantiationForWage: req.substantiationForWage,
        hoursPerWeek: req.hoursPerWeek,
        minimalWorkHours: req.minimalWorkHours,
        vacationPercentage: req.vacationPercentage,
        numberHoliday: req.numberHoliday,
        workedHours: req.workedHours,
        thirteenthMonth: req.thirteenthMonth,
        otherPaymentPercentage: req.otherPaymentPercentage,
        chargeTravelDistanceExpenses: req.chargeTravelDistanceExpenses,
        chargeTravelHoursExpenses: req.chargeTravelHoursExpenses,
        chargeOtherExpenses: req.chargeOtherExpenses,
        chargeWorkLogExpenses: req.chargeWorkLogExpenses,
        brokerFee: req.brokerFee || 0,
        exchangeHousing: req.exchangeHousing,
        exchangeHousingInterval: req.exchangeHousingInterval,
        exchangeOtherExpense: req.exchangeOtherExpense,
        exchangeOtherExpenseUnit: req.exchangeOtherExpenseUnit,
        documentUploaded: req.documentUploaded,
        deductions: req.deductions,
        deductionsInterval: req.deductionsInterval,
        healthInsuranceDeduction: req.healthInsuranceDeduction,
        healthInsuranceDeductionInterval: req.healthInsuranceDeductionInterval,
        explanationDeductions: req.explanationDeductions,
        desiredNetCompensation: req.desiredNetCompensation,
        pensionOptions: req.pensionOptions || pensionType.BASIC,
        workAddresses: req.workAddresses,
        projectIds: req.projectIds,
        homeLeaveAllowance: req.homeLeaveAllowance,
        costOfLivingAllowance: req.costOfLivingAllowance,
        hiringCompanyReceivesConfirmationEmail:
          req.hiringCompanyReceivesConfirmationEmail,
        'germanData.payScale': req.germanData ? req.germanData.payScale : null,
        'germanData.assignmentTime': req.germanData
          ? req.germanData.assignmentTime
          : null,
        'germanData.standardAllowance': req.germanData
          ? req.germanData.standardAllowance
          : 0,
        startDate: req.startDate,
        endDate: req.endDate
      }
    ]
  }
  if (signData.worker.freelancer && req.freelancerData) {
    data.periodVariables[0].freelancerData = getFreelancerData(
      req.freelancerData,
      false
    )
  }
  if (signData.createdAt) {
    data.createdAt = signData.createdAt
  }

  return data
}

const getContractCompanyData = company => {
  return {
    name: company.name || '',
    city: company.city || '',
    streetName: company.street || '',
    houseNumber: company.houseNumber || '',
    houseNumberAddition: company.houseNumberAddition || '',
    termOfPayment: company.termOfPayment || '',
    postalCode: company.postalCode || '',
    kvkNumber: company.kvkNumber || '',
    email: company.email || '',
    IBAN: company.IBAN || '',
    GAccount: company.GAccount || '',
    fullAddress: fullAddressFormatter(company)
  }
}

const getContractManagerData = manager => {
  return {
    firstName: manager.firstName || '',
    middleName: manager.middleName || '',
    lastName: manager.lastName || '',
    streetName: manager.street || '',
    houseNumber: manager.houseNumber || '',
    houseNumberAddition: manager.houseNumberAddition || '',
    postalCode: manager.postalCode || '',
    city: manager.city || '',
    email: manager.email || '',
    bankNumber: manager.bankNumber || '',
    birthday: toNLDateString(manager.birthday),
    socialSecurityNumber: manager.socialSecurityNumber || '',
    identificationType: manager.identificationType || '',
    identificationNumber: manager.identificationNumber || '',
    identificationExpirationDate: toNLDateString(
      manager.identificationExpirationDate
    ),
    title: getHonorificTitle(manager.honorificTitle),
    fullName: fullNameFormatter(manager),
    phone: manager.phone || '',
    profession: manager.profession || ''
  }
}

const getPeriodVariable = (jobOffer, date = new Date()) => {
  if (jobOffer && jobOffer.periodVariables && jobOffer.periodVariables.length) {
    const length = jobOffer.periodVariables.length
    if (length === 1) {
      delete jobOffer.periodVariables[0]._id
      return { periodVariable: jobOffer.periodVariables[0], version: 1 }
    }
    if (date < new Date(jobOffer.startDate)) {
      delete jobOffer.periodVariables[0]._id
      return { periodVariable: jobOffer.periodVariables[0], version: 1 }
    }
    if (jobOffer.endDate && date > new Date(jobOffer.endDate)) {
      delete jobOffer.periodVariables[length - 1]._id
      return {
        periodVariable: jobOffer.periodVariables[length - 1],
        version: length
      }
    }
    for (let i = 0; i < length; i++) {
      delete jobOffer.periodVariables[i]._id
      const item = jobOffer.periodVariables[i]
      if (item.endDate) {
        if (
          new Date(item.startDate) <= date &&
          new Date(item.endDate) >= date
        ) {
          return { periodVariable: item, version: i + 1 }
        }
      } else if (new Date(item.startDate) <= date) {
        return { periodVariable: item, version: i + 1 }
      }
    }
  }
  return { periodVariable: {}, version: 0 }
}

const getTaxContractData = jobOffer => {
  const { periodVariable } = getPeriodVariable(jobOffer)
  const { worker, paymentCompany } = jobOffer.contractData
  return {
    worker: {
      firstName: worker.firstName || '',
      middleName: worker.middleName || '',
      lastName: worker.lastName || '',
      streetName: worker.street || '',
      houseNumber: worker.houseNumber || '',
      houseNumberAddition: worker.houseNumberAddition || '',
      postalCode: worker.postalCode || '',
      ...getAddress(worker),
      birthday: toNLDateString(worker.birthday),
      socialSecurityNumber: worker.socialSecurityNumber || '',
      title: getHonorificTitle(worker.honorificTitle),
      fullName: fullNameFormatter(worker)
    },
    paymentCompany: {
      name: paymentCompany.name || ''
    },
    jobOffer: {
      startDate: toNLDateString(jobOffer.startDate),
      discountOnTaxes: periodVariable.discountOnTaxes === discountTaxType.YES
    },
    sign: {
      date: toNLDateString(new Date())
    }
  }
}

const getContractData = jobOffer => {
  const {
    worker,
    company,
    manager,
    companyOwner,
    paymentCompany,
    paymentManager,
    hiringCompany,
    hiringManager,
    hiringCompanyOwner,
    job,
    collectiveAgreement,
    contractType
  } = jobOffer.contractData
  const managerSign =
    jobOffer.contractSigned.find(signed => signed.role === roleType.MANAGER) ||
    {}
  const workerSign =
    jobOffer.contractSigned.find(signed => signed.role === roleType.WORKER) ||
    {}
  const hiringManagerSign =
    jobOffer.contractSigned.find(
      signed => signed.role === roleType.HIRING_MANAGER
    ) || {}
  let freelancerData
  const { periodVariable } = getPeriodVariable(jobOffer)
  if (periodVariable.freelancerData) {
    freelancerData = getFreelancerData(periodVariable.freelancerData, true)
  }

  return {
    contractType,
    company: getContractCompanyData(company),
    paymentCompany: getContractCompanyData(paymentCompany),
    hiringCompany: getContractCompanyData(hiringCompany),
    companyOwner: getContractManagerData(companyOwner),
    manager: getContractManagerData(manager),
    paymentManager: getContractManagerData(paymentManager),
    hiringManager: getContractManagerData(hiringManager),
    hiringCompanyOwner: getContractManagerData(hiringCompanyOwner),
    worker: {
      firstName: worker.firstName || '',
      middleName: worker.middleName || '',
      lastName: worker.lastName || '',
      profession:
        jobOffer.workerProfession && jobOffer.workerProfession.name
          ? jobOffer.workerProfession.description
          : '',
      streetName: worker.street || '',
      houseNumber: worker.houseNumber || '',
      houseNumberAddition: worker.houseNumberAddition || '',
      postalCode: worker.postalCode || '',
      city: worker.city || '',
      email: worker.email || '',
      bankNumber: worker.bankNumber || '',
      birthday: toNLDateString(worker.birthday),
      socialSecurityNumber: worker.socialSecurityNumber || '',
      identificationType: worker.identificationType || '',
      identificationNumber: worker.identificationNumber || '',
      identificationExpirationDate: toNLDateString(
        worker.identificationExpirationDate
      ),
      title: getHonorificTitle(worker.honorificTitle),
      fullName: fullNameFormatter(worker),
      ...getAddress(worker),
      freelancerCompanyName: worker.freelancerData
        ? worker.freelancerData.companyName
        : '',
      freelancerCompanyAddress: worker.freelancerData
        ? worker.freelancerData.companyAddress
        : '',
      freelancerKvkNumber: worker.freelancerData
        ? worker.freelancerData.kvkNumber
        : '',
      registeredInNetherlands: worker.freelancerData
        ? worker.freelancerData.registeredInNetherlands
        : ''
    },
    jobOffer: {
      startDate: toNLDateString(jobOffer.startDate),
      endDate: toNLDateString(jobOffer.endDate),
      hoursPerWeek: periodVariable.hoursPerWeek || 0,
      CAO: collectiveAgreement ? collectiveAgreement.name : '',
      hourlyWage: periodVariable.hourlyWage || 0,
      wage: periodVariable.wage || 0,
      payRate: periodVariable.payRate || 0,
      termOfPayment: termOfPaymentFormatter(periodVariable.termOfPayment),
      workedHours: periodVariable.workedHours || 1560,
      travelHoursPerWeek: periodVariable.travelHoursPerWeek || 0,
      travelDistanceExpenseRate: getTravelDistanceExpenseRate(
        periodVariable.travelDistanceExpenseRate
      ),
      travelDistanceExpenseForOneWay:
        periodVariable.travelDistanceExpenseForOneWay || '',
      germanPayScale: periodVariable.germanData
        ? periodVariable.germanData.payScale || ''
        : '',
      germanStandardAllowance: periodVariable.germanData
        ? periodVariable.germanData.standardAllowance || 0
        : 0,
      germanAssignmentTime: periodVariable.germanData
        ? periodVariable.germanData.assignmentTime || ''
        : '',
      deductions: periodVariable.deductions || 0,
      deductionsInterval: expenseUnitFormatter(
        periodVariable.deductionsInterval
      )
    },
    job: {
      title:
        jobOffer.type !== offerType.DIRECT
          ? job.title
          : periodVariable.directJobTitle
    },
    freelancerData,
    sign: {
      worker: {
        date: toNLDateTimeString(workerSign.signDate),
        ip: workerSign.ip || '',
        browserAgent: workerSign.browserAgent || ''
      },
      manager: {
        date: toNLDateTimeString(managerSign.signDate),
        ip: managerSign.ip || '',
        browserAgent: managerSign.browserAgent || ''
      },
      hiringManager: {
        date: toNLDateTimeString(hiringManagerSign.signDate),
        ip: hiringManagerSign.ip || '',
        browserAgent: hiringManagerSign.browserAgent || ''
      }
    }
  }
}

const getDocusignContractData = jobOffer => {
  const worker = jobOffer['contractData.worker']
  const paymentCompany = jobOffer['contractData.paymentCompany']
  const paymentManager = jobOffer['contractData.paymentManager']
  const hiringCompany = jobOffer['contractData.hiringCompany']
  const hiringManager = jobOffer['contractData.hiringManager']
  const job = jobOffer['contractData.job']
  const collectiveAgreement = jobOffer['contractData.collectiveAgreement']
  const salaryTable = jobOffer['contractData.salaryTable']
  const salaryTableJob = jobOffer['contractData.salaryTableJob']
  const periodVariable = jobOffer.periodVariables[0]

  return {
    HC_manager_fullname: fullNameFormatter(hiringManager),
    HC_address_line1: fullAddressFormatter(hiringCompany),
    HC_address_postcode_city: `${hiringCompany.postalCode} ${hiringCompany.city}`,
    HC_address_city: hiringCompany.city || '',
    HC_company_name: hiringCompany.name || '',
    HC_company_phone_number: hiringCompany.phoneNumber || '',
    WORKER_fullname: fullNameFormatter(worker),
    WORKER_birthdate: toNLDateString(worker.birthday),
    WORKER_permanent_address_line1: getAddress(worker).fullAddress,
    WORKER_permanent_address_postcode: worker.postalCode || '',
    WORKER_permanent_address_city: worker.city || '',
    WORKER_permanent_address_country: worker.country || '',
    WORKER_email: worker.email || '',
    WORKER_BSN: worker.bsn || '',
    PC_manager_fullname: fullNameFormatter(paymentManager),
    PC_address_line1: fullAddressFormatter(paymentCompany),
    PC_address_postcode_city: `${paymentCompany.postalCode} ${paymentCompany.city}`,
    PC_address_city: paymentCompany.city || '',
    PC_company_name: paymentCompany.name || '',
    PC_phone_number: paymentCompany.phoneNumber || '',
    JO_start_date: toNLDateString(jobOffer.startDate),
    JO_end_date: toNLDateString(jobOffer.endDate),
    JO_function_name: job ? job.title : periodVariable.directJobTitle,
    JO_pay_scale: periodVariable.payscale || 0,
    JO_hours_per_week: periodVariable.hoursPerWeek || 0,
    JO_cao_name: collectiveAgreement ? collectiveAgreement.name : '',
    JO_hourly_rate: periodVariable.hourlyWage || 0,
    JO_ADV: '@todo',
    JO_compensations: '@todo',
    JO_reservations: '@todo',
    JO_monthly_salary: '@todo',
    JO_travel_hours: periodVariable.travelHoursPerWeek || 0,
    JO_KM_compensation: getTravelDistanceExpenseRate(
      periodVariable.travelDistanceExpenseRate
    ),
    JO_submit_date: toNLDateString(jobOffer.createdAt),
    JO_pay_rate: periodVariable.payRate || 0,
    JO_invoice_payment_days: termOfPaymentFormatter(
      periodVariable.termOfPayment
    ),
    JO_take_over_hours: periodVariable.workedHours || 1560,
    JO_ET_health_insurance_deduction:
      periodVariable.healthInsuranceDeduction || 0,
    JO_ET_exchange_housing: periodVariable.exchangeHousing || 0,
    JO_ET_home_leave_allowance: periodVariable.homeLeaveAllowance || 0,
    JO_ET_cost_of_living_allowance: periodVariable.costOfLivingAllowance || 0,
    JO_Salary_Table_Name: salaryTable ? salaryTable.name : '',
    JO_Job_Level: salaryTableJob ? salaryTableJob.name : '',
    JO_Pay_scale: periodVariable.payscale || 0,
    JO_periodical: periodVariable.periodical || 0
  }
}

const checkOverlappingDates = (offers, startDate, endDate) => {
  startDate = new Date(startDate)
  endDate = endDate ? new Date(endDate) : new Date('9999-12-31')
  if (startDate > endDate) {
    endDate = new Date('9999-12-31') // hacking solution
  }

  if (offers.length === 0) {
    return false
  }
  let isOverlappingDate = false
  offers.forEach(item => {
    item.endDate = item.endDate
      ? new Date(item.endDate)
      : new Date('9999-12-31')
    if (new Date(item.startDate) > new Date(item.endDate)) {
      item.endDate = new Date('9999-12-31')
    }
    if (
      !(
        startDate > new Date(item.endDate) || endDate < new Date(item.startDate)
      )
    ) {
      isOverlappingDate = true
    }
  })
  return isOverlappingDate
}

const checkCompanyInSignAbleContract = company => {
  const validations = []
  // validate company info
  if (!company.name) {
    validations.push('COMPANY_NAME_INVALID')
  }
  if (!company.email) {
    validations.push('COMPANY_EMAIL_INVALID')
  }
  if (!company.phoneNumber) {
    validations.push('COMPANY_PHONE_NUMBER_INVALID')
  }
  if (!company.country) {
    validations.push('COMPANY_COUNTRY_INVALID')
  }
  if (!company.city) {
    validations.push('COMPANY_CITY_INVALID')
  }
  if (!company.postalCode) {
    validations.push('COMPANY_POSTAL_CODE_INVALID')
  }
  if (!company.ownerId) {
    validations.push('COMPANY_OWNER_NOT_SET')
  }

  if (company.country && company.country !== 'Netherlands') {
    if (!company.addressLine1) {
      validations.push('COMPANY_ADDRESS_LINE1_INVALID')
    }
    if (!company.state) {
      validations.push('COMPANY_STATE_INVALID')
    }
  }
  if (company.country && company.country === 'Netherlands') {
    if (!company.street) {
      validations.push('COMPANY_STREET_INVALID')
    }
    if (!company.houseNumber) {
      validations.push('COMPANY_HOUSE_NUMBER_INVALID')
    }
    // if (!company.houseNumberAddition && company.country === 'Netherlands') {
    //   validations.company.push('COMPANY_HOUSE_NUMBER_ADDITION_INVALID')
    // }
  }
  return validations
}

const checkHiringCompanyInSignAbleContract = company => {
  const validations = []
  if (!company.ownerId) {
    validations.push('HIRING_COMPANY_OWNER_NOT_SET')
  }
  if (company.isCaoRequired && (!company.caoIds || !company.caoIds.length)) {
    validations.push('HIRING_COMPANY_CAO_NOT_EXISTED')
  }
  return validations
}

const checkManagerInSignAbleContract = manager => {
  const validations = []

  if (!manager.firstName) {
    validations.push('MANAGER_FIRST_NAME_INVALID')
  }
  if (!manager.lastName) {
    validations.push('MANAGER_LAST_NAME_INVALID')
  }
  if (!manager.phone) {
    validations.push('MANAGER_PHONE_NUMBER_INVALID')
  }

  return validations
}

const checkFlexWorkerInSignAbleContract = worker => {
  const validations = []

  if (!worker.firstName) {
    validations.push('WORKER_FIRST_NAME_INVALID')
  }
  if (!worker.lastName) {
    validations.push('WORKER_LAST_NAME_INVALID')
  }
  if (!worker.birthday) {
    validations.push('WORKER_BIRTHDAY_INVALID')
  }
  if (!worker.nationality) {
    validations.push('WORKER_NATIONALITY_INVALID')
  }
  if (!worker.socialSecurityNumber) {
    validations.push('WORKER_SOCIAL_SECURITY_NUMBER_INVALID')
  }
  if (!worker.gonnaWorkIn) {
    validations.push('WORKER_GONNA_WORK_IN_INVALID')
  }
  if (!worker.bankNumber) {
    validations.push('WORKER_BANK_NUMBER_INVALID')
  }
  if (!worker.identificationType) {
    validations.push('WORKER_IDENTIFICATION_TYPE_INVALID')
  }
  if (!worker.identificationNumber) {
    validations.push('WORKER_IDENTIFICATION_NUMBER_INVALID')
  }
  if (!worker.identificationExpirationDate) {
    validations.push('WORKER_IDENTIFICATION_EXPIRATION_DATE_INVALID')
  }
  if (!worker.idFrontImage || !worker.idFrontImage.name) {
    validations.push('WORKER_IDENTIFICATION_IMAGE_INVALID')
  }
  if (!worker.idBackImage || !worker.idBackImage.name) {
    validations.push('WORKER_IDENTIFICATION_IMAGE_INVALID')
  }

  if (!worker.permanentAddress || !worker.permanentAddress.country) {
    validations.push('WORKER_PERMANENT_COUNTRY_INVALID')
  } else if (worker.permanentAddress.country === 'Netherlands') {
    if (!worker.permanentAddress.postalCode) {
      validations.push('WORKER_PERMANENT_POSTAL_CODE_INVALID')
    }
    if (!worker.permanentAddress.street) {
      validations.push('WORKER_PERMANENT_STREET_INVALID')
    }
    if (!worker.permanentAddress.houseNumber) {
      validations.push('WORKER_PERMANENT_HOUSE_NUMBER_INVALID')
    }
    // if (!worker.permanentAddress.houseNumberAddition) {
    //   validations.push('WORKER_PERMANENT_HOUSE_NUMBER_ADDITION_INVALID')
    // }
  } else if (worker.permanentAddress.country !== 'Netherlands') {
    if (!worker.permanentAddress.addressLine1) {
      validations.push('WORKER_PERMANENT_ADDRESS_LINE1_INVALID')
    }
  }

  if (!worker.permanentAddress || !worker.permanentAddress.city) {
    validations.push('WORKER_PERMANENT_CITY_INVALID')
  }

  if (worker.gonnaWorkIn) {
    if (worker.gonnaWorkIn === 'Netherlands') {
      if (worker.nationality !== 'Netherlands' && !worker.bsn) {
        validations.push('WORKER_BSN_INVALID')
      }
      if (
        worker.permanentAddress &&
        worker.permanentAddress.country &&
        worker.permanentAddress.country !== 'Netherlands'
      ) {
        if (!worker.postalCode) {
          validations.push('WORKER_POSTAL_CODE_INVALID')
        }
        if (!worker.houseNumber) {
          validations.push('WORKER_HOUSE_NUMBER_INVALID')
        }
        if (!worker.street) {
          validations.push('WORKER_STREET_INVALID')
        }
        if (!worker.city) {
          validations.push('WORKER_CITY_INVALID')
        }
      }
    } else {
      if (typeof worker.workedInGermany !== 'boolean') {
        validations.push('WORKER_WORKED_IN_GERMANY_INVALID')
      }
      if (!worker.birthName) {
        validations.push('WORKER_BIRTH_NAME_INVALID')
      }
      if (!worker.religion) {
        validations.push('WORKER_RELIGION_INVALID')
      }
      if (!worker.maritalStatus) {
        validations.push('WORKER_MARITAL_STATUS_INVALID')
      }
      if (!worker.workingAs) {
        validations.push('WORKER_WORKING_AS_INVALID')
      }
      if (!worker.preferredNetSalary) {
        validations.push('WORKER_PREFERRED_NET_SALARY_INVALID')
      }
    }
  }

  if (
    worker.nationality &&
    ![...euCountries, ...europeanFreeTradeAssociation].includes(
      worker.nationality
    )
  ) {
    if (!worker.workPermit || !worker.workPermit.docType) {
      validations.push('WORKER_WORK_PERMIT_DOC_TYPE_INVALID')
    }
    if (!worker.workPermit || !worker.workPermit.idNumber) {
      validations.push('WORKER_WORK_PERMIT_ID_NUMBER_INVALID')
    }
    if (!worker.workPermit || !worker.workPermit.expirationDate) {
      validations.push('WORKER_WORK_PERMIT_EXPIRATION_DATE_INVALID')
    }
    if (
      !worker.workPermit ||
      !worker.workPermit.imageFront ||
      !worker.workPermit.imageFront.name
    ) {
      validations.push('WORKER_WORK_PERMIT_IMAGE_FRONT_INVALID')
    }
    if (
      !worker.workPermit ||
      !worker.workPermit.imageRear ||
      !worker.workPermit.imageRear.name
    ) {
      validations.push('WORKER_WORK_PERMIT_IMAGE_BACK_INVALID')
    }
  }

  return validations
}

const checkFreelancerInSignAbleContract = worker => {
  const validations = []

  if (!worker.firstName) {
    validations.push('WORKER_FIRST_NAME_INVALID')
  }
  if (!worker.lastName) {
    validations.push('WORKER_LAST_NAME_INVALID')
  }
  if (!worker.professionId) {
    validations.push('WORKER_PROFESSION_INVALID')
  }
  if (!worker.bankNumber) {
    validations.push('WORKER_BANK_NUMBER_INVALID')
  }
  if (!worker.freelancerData || !worker.freelancerData.companyName) {
    validations.push('FREELANCER_COMPANY_NAME_INVALID')
  }
  if (!worker.freelancerData || !worker.freelancerData.BTW) {
    validations.push('FREELANCER_VAT_INVALID')
  }
  if (
    !worker.freelancerData ||
    typeof worker.freelancerData.registeredInNetherlands !== 'boolean'
  ) {
    validations.push('FREELANCER_REGISTERED_IN_NETHERLANDS_INVALID')
  }
  if (
    !worker.freelancerData ||
    (worker.freelancerData.registeredInNetherlands &&
      !worker.freelancerData.kvkNumber)
  ) {
    validations.push('FREELANCER_KVK_INVALID')
  }
  if (
    !worker.freelancerData ||
    (!worker.freelancerData.registeredInNetherlands &&
      (!worker.freelancerData.A1certificate ||
        !worker.freelancerData.A1certificate.name))
  ) {
    validations.push('FREELANCER_A1_CERTIFICATE_INVALID')
  }

  if (!worker.permanentAddress || !worker.permanentAddress.country) {
    validations.push('WORKER_PERMANENT_COUNTRY_INVALID')
  }
  if (!worker.permanentAddress || !worker.permanentAddress.city) {
    validations.push('WORKER_PERMANENT_CITY_INVALID')
  }
  if (
    worker.nationality &&
    ![...euCountries, ...europeanFreeTradeAssociation].includes(
      worker.nationality
    )
  ) {
    if (!worker.workPermit || !worker.workPermit.docType) {
      validations.push('WORKER_WORK_PERMIT_DOC_TYPE_INVALID')
    }
    if (!worker.workPermit || !worker.workPermit.idNumber) {
      validations.push('WORKER_WORK_PERMIT_ID_NUMBER_INVALID')
    }
  }

  return validations
}

const checkGeneralInfoInSignAbleContract = (
  req,
  jobOffer,
  isPeriod = false
) => {
  const validations = []
  if (!req.startDate) {
    validations.push('OFFER_START_DATE_INVALID')
  }
  if (req.endDate && new Date(req.startDate) > new Date(req.endDate)) {
    validations.push('END_DATE_EARLIER_START_DATE')
  }
  if (!isPeriod && !req.contractTypeId) {
    validations.push('OFFER_CONTRACT_TYPE_INVALID')
  }
  if (req.type === offerType.DIRECT && !req.directJobTitle) {
    validations.push('OFFER_JOB_TITLE_INVALID')
  }
  if (req.wage < 0) {
    validations.push('OFFER_WAGE_INVALID')
  }
  if (req.hourlyWage <= 0) {
    validations.push('OFFER_HOURLY_WAGE_INVALID')
  }
  if (req.hoursPerWeek <= 0) {
    validations.push('OFFER_HOURS_PER_WEEK_INVALID')
  }
  if (req.travelDistanceExpenseRate < 0) {
    validations.push('OFFER_TRAVEL_COMPENSATION_PER_KM_INVALID')
  }
  if (req.travelDistanceExpenseForOneWay < 0) {
    validations.push('OFFER_TRAVEL_ONE_WAY_DISTANCE_INVALID')
  }
  if (req.travelHoursPerWeek < 0) {
    validations.push('OFFER_TRAVEL_TIME_COMPENSATION_PER_WEEK_INVALID')
  }
  if (req.workedHours < 0) {
    validations.push('OFFER_TRAVEL_TIME_COMPENSATION_PER_WEEK_INVALID')
  }
  if (req.otherExpenses < 0) {
    validations.push('OFFER_TRAVEL_TIME_COMPENSATION_PER_WEEK_INVALID')
  }

  // validate multiple addresses
  if (req.workAddresses && req.workAddresses.length) {
    for (const workAddress of req.workAddresses) {
      const hasWorkAddressCountryErr = validations.includes(
        'OFFER_WORK_ADDRESS_COUNTRY_INVALID'
      )
      const hasWorkAddressStreetErr = validations.includes(
        'OFFER_WORK_ADDRESS_STREET_INVALID'
      )
      const hasWorkAddressHouseNumberErr = validations.includes(
        'OFFER_WORK_ADDRESS_HOUSE_NUMBER_INVALID'
      )
      const hasWorkAddressLine1Err = validations.includes(
        'OFFER_WORK_ADDRESS_LINE1_INVALID'
      )
      const hasWorkAddressStateErr = validations.includes(
        'OFFER_WORK_ADDRESS_STATE_INVALID'
      )
      const hasWorkAddressCityErr = validations.includes(
        'OFFER_WORK_ADDRESS_CITY_INVALID'
      )
      const hasWorkAddressPostalCodeErr = validations.includes(
        'OFFER_WORK_ADDRESS_POSTAL_CODE_INVALID'
      )
      if (!workAddress.country && !hasWorkAddressCountryErr) {
        validations.push('OFFER_WORK_ADDRESS_COUNTRY_INVALID')
      }
      if (
        workAddress.country === 'Netherlands' &&
        !workAddress.street &&
        !hasWorkAddressStreetErr
      ) {
        validations.push('OFFER_WORK_ADDRESS_STREET_INVALID')
      }
      if (
        workAddress.country === 'Netherlands' &&
        !workAddress.houseNumber &&
        !hasWorkAddressHouseNumberErr
      ) {
        validations.push('OFFER_WORK_ADDRESS_HOUSE_NUMBER_INVALID')
      }
      // if (
      //   workAddress.country === 'Netherlands' &&
      //   !workAddress.houseNumberAddition &&
      //   !hasWorkAddressHouseNumberAddErr
      // ) {
      //   validations.push(
      //     'OFFER_WORK_ADDRESS_HOUSE_NUMBER_ADDITION_INVALID'
      //   )
      // }
      if (
        workAddress.country !== 'Netherlands' &&
        !workAddress.addressLine1 &&
        !hasWorkAddressLine1Err
      ) {
        validations.push('OFFER_WORK_ADDRESS_LINE1_INVALID')
      }
      if (
        workAddress.country !== 'Netherlands' &&
        !workAddress.state &&
        !hasWorkAddressStateErr
      ) {
        validations.push('OFFER_WORK_ADDRESS_STATE_INVALID')
      }
      if (!workAddress.postalCode && !hasWorkAddressPostalCodeErr) {
        validations.push('OFFER_WORK_ADDRESS_POSTAL_CODE_INVALID')
      }
      if (!workAddress.city && !hasWorkAddressCityErr) {
        validations.push('OFFER_WORK_ADDRESS_CITY_INVALID')
      }
    }
  }
  if (
    (req.exchangeHousing > 0 || req.exchangeOtherExpense > 0) &&
    !req.documentUploaded
  ) {
    validations.push('ET_DOCUMENT_UPLOADED_INVALID')
  }
  if (
    !isEqualIDs(jobOffer.companyId, jobOffer.hiringCompanyId) &&
    req.payRate < 0
  ) {
    validations.push('OFFER_PAY_RATE_INVALID')
  }

  return validations
}

const checkFreelancerTypeSpecification = (req, isPeriod = false) => {
  const validations = []

  const booleanArray = [null, true, false]
  const periodArray = [null, ...freelancerJson.INSURANCE_PERIODIEK_MPC]
  const vatArray = [null, ...freelancerJson.VAT_INCLUDED_MPC]
  const termOfPaymentsArray = [null, ...termsOfPayments]
  if (
    !freelancerJson.UITVOERING_MPC.includes(req.freelancerData.UITVOERING_MPC)
  ) {
    validations.push('OFFER_FREELANCER_UITVOERING_MPC_INVALID')
  }
  if (!booleanArray.includes(req.freelancerData.VOG_OPTIONAL)) {
    validations.push('OFFER_FREELANCER_VOG_OPTIONAL_INVALID')
  }
  if (!booleanArray.includes(req.freelancerData.KEURMERK_OPTIONAL)) {
    validations.push('OFFER_FREELANCER_KEURMERK_OPTIONAL_INVALID')
  }
  if (!booleanArray.includes(req.freelancerData.BEROEPSREGISTER_OPTIONAL)) {
    validations.push('OFFER_FREELANCER_BEROEPSREGISTER_OPTIONAL_INVALID')
  }
  if (!booleanArray.includes(req.freelancerData.WAADI_OPTIONAL)) {
    validations.push('OFFER_FREELANCER_WAADI_OPTIONAL_INVALID')
  }
  if (!periodArray.includes(req.freelancerData.INSURANCE_PERIODIEK_MPC)) {
    validations.push('OFFER_FREELANCER_INSURANCE_PERIODIEK_MPC_INVALID')
  }

  if (!booleanArray.includes(req.freelancerData.VEILIGHEID_OPTIONAL)) {
    validations.push('OFFER_FREELANCER_VEILIGHEID_OPTIONAL_INVALID')
  }
  if (!isPeriod && ![null, true].includes(req.freelancerData.MANDATORY)) {
    validations.push('OFFER_FREELANCER_MANDATORY_INVALID')
  }
  if (!booleanArray.includes(req.freelancerData.SCREENING_OPTIONAL)) {
    validations.push('OFFER_FREELANCER_SCREENING_OPTIONAL_INVALID')
  }
  if (!booleanArray.includes(req.freelancerData.SELECTION_OPTIONAL)) {
    validations.push('OFFER_FREELANCER_SELECTION_OPTIONAL_INVALID')
  }
  if (!booleanArray.includes(req.freelancerData.FACTUUR_CONTROLE_OPTIONAL)) {
    validations.push('OFFER_FREELANCER_FACTUUR_CONTROLE_OPTIONAL_INVALID')
  }
  if (
    !booleanArray.includes(
      req.freelancerData.FACTUUR_CONTROLE_AANLEVERING_OPTIONAL
    )
  ) {
    validations.push(
      'OFFER_FREELANCER_FACTUUR_CONTROLE_AANLEVERING_OPTIONAL_INVALID'
    )
  }

  if (
    !booleanArray.includes(req.freelancerData.OVEREENKOMST_BEGELEIDING_OPTIONAL)
  ) {
    validations.push(
      'OFFER_FREELANCER_OVEREENKOMST_BEGELEIDING_OPTIONAL_INVALID'
    )
  }
  if (!booleanArray.includes(req.freelancerData.BEMIDDELING_OPTIONAL)) {
    validations.push('OFFER_FREELANCER_BEMIDDELING_OPTIONAL_INVALID')
  }
  if (!booleanArray.includes(req.freelancerData.OVEREENKOMST_OPTIONAL)) {
    validations.push('OFFER_FREELANCER_OVEREENKOMST_OPTIONAL_INVALID')
  }
  if (!booleanArray.includes(req.freelancerData.VOORFINANCIERING_OPTIONAL)) {
    validations.push('OFFER_FREELANCER_VOORFINANCIERING_OPTIONAL_INVALID')
  }
  if (!vatArray.includes(req.freelancerData.VAT_INCLUDED_MPC_2)) {
    validations.push('OFFER_FREELANCER_VAT_INCLUDED_MPC_2_INVALID')
  }
  if (!vatArray.includes(req.freelancerData.BIJLAGE_2_VAT_INCLUDED)) {
    validations.push('OFFER_FREELANCER_BIJLAGE_2_VAT_INCLUDED_INVALID')
  }
  if (
    !termOfPaymentsArray.includes(
      req.freelancerData.BIJLAGE_2_VERGOEDINGEN_BETALINGSTERMIJN_MPC
    )
  ) {
    validations.push(
      'OFFER_FREELANCER_BIJLAGE_2_VERGOEDINGEN_BETALINGSTERMIJN_MPC_INVALID'
    )
  }
  if (
    !termOfPaymentsArray.includes(
      req.freelancerData.BIJLAGE_2_HULPMIDDELEN_BETALINGSTERMIJN_MPC
    )
  ) {
    validations.push(
      'OFFER_FREELANCER_BIJLAGE_2_HULPMIDDELEN_BETALINGSTERMIJN_MPC_INVALID'
    )
  }
  if (!isPeriod && !req.freelancerData.BIJLAGE_STARTDATE) {
    validations.push('OFFER_FREELANCER_BIJLAGE_STARTDATE_INVALID')
  }

  if (!req.freelancerData.BIJLAGE_2_HOURLY_RATE_FL_PC) {
    validations.push('OFFER_FREELANCER_BIJLAGE_2_HOURLY_RATE_FL_PC_INVALID')
  }
  if (!req.freelancerData.BIJLAGE_2_HOURS_PER_WEEK) {
    validations.push('OFFER_FREELANCER_BIJLAGE_2_HOURS_PER_WEEK_INVALID')
  }
  if (!req.freelancerData.BIJLAGE_3_HOURLY_RATE_PC_HC) {
    validations.push('OFFER_FREELANCER_BIJLAGE_3_HOURLY_RATE_PC_HC_INVALID')
  } else if (
    Number(req.freelancerData.BIJLAGE_2_HOURLY_RATE_FL_PC) > 0 &&
    Number(req.freelancerData.BIJLAGE_3_HOURLY_RATE_PC_HC) <=
      Number(req.freelancerData.BIJLAGE_2_HOURLY_RATE_FL_PC)
  ) {
    validations.push(
      'OFFER_FREELANCER_BIJLAGE_3_HOURLY_RATE_PC_HC_SHOULD_GREATER_THAN_BIJLAGE_2_HOURLY_RATE_FL_PC'
    )
  }
  if (!req.freelancerData.BIJLAGE_3_HOURS_PER_WEEK) {
    validations.push('OFFER_FREELANCER_BIJLAGE_3_HOURS_PER_WEEK_INVALID')
  } else if (
    Number(req.freelancerData.BIJLAGE_2_HOURS_PER_WEEK) > 0 &&
    Number(req.freelancerData.BIJLAGE_3_HOURS_PER_WEEK) !==
      Number(req.freelancerData.BIJLAGE_2_HOURS_PER_WEEK)
  ) {
    validations.push(
      'OFFER_FREELANCER_BIJLAGE_3_HOURS_PER_WEEK_SHOULD_EQUAL_BIJLAGE_2_HOURS_PER_WEEK'
    )
  }

  return validations
}

const checkTypeSpecificationInSignAbleContract = ({
  req,
  worker,
  contractType,
  isPeriod = false
}) => {
  const validations = []

  if (!isPeriod) {
    if (!worker.freelancer) {
      if (
        contractType &&
        contractType.version === contractVersionType.TRADITIONAL &&
        contractType.companyContractTemplatePath &&
        contractType.companyContractTemplatePath.indexOf('freelancer') !== -1
      ) {
        validations.push('OFFER_CONTRACT_TYPE_INVALID')
      }
    }
    if (worker.gonnaWorkIn !== 'Germany') {
      if (
        contractType &&
        contractType.version === contractVersionType.TRADITIONAL &&
        contractType.companyContractTemplatePath &&
        contractType.companyContractTemplatePath.indexOf('german') !== -1
      ) {
        validations.push('OFFER_CONTRACT_TYPE_INVALID')
      }
    }
  }
  if (
    contractType &&
    contractType.version === contractVersionType.TRADITIONAL &&
    contractType.companyContractTemplatePath &&
    contractType.companyContractTemplatePath.indexOf('german') > -1
  ) {
    if (!req.germanData.payScale) {
      validations.push('OFFER_GERMAN_PAY_SCALE_INVALID')
    }
    if (req.germanData.standardAllowance < 0) {
      validations.push('OFFER_GERMAN_STANDARD_ALLOWANCE_INVALID')
    }
    if (!req.germanData.assignmentTime) {
      validations.push('OFFER_GERMAN_ASSIGNMENT_TIME_INVALID')
    }
  }

  // check ORP
  if (req.ORPId && req.ORP) {
    if (isFreelancerContract(contractType) && !req.ORP.isApplyFreelancer) {
      validations.push('OFFER_ORP_INVALID')
    }
    if (!isFreelancerContract(contractType) && req.ORP.isApplyFreelancer) {
      validations.push('OFFER_ORP_INVALID')
    }
  }
  const booleanArray = [null, true, false]
  if (worker.freelancer && isFreelancerContract(contractType)) {
    validations.push(...checkFreelancerTypeSpecification(req, isPeriod))
  } else if (!isPeriod && req.applyCaoSubstantiation) {
    if (!req.collectiveAgreementId) {
      validations.push('OFFER_CAO_INVALID')
    } else if (req.customCao) {
      if (
        !req.customCao.name ||
        (req.customCao.adv && typeof req.customCao.adv !== 'number') ||
        !booleanArray.includes(req.customCao.includeInHourlyWage) ||
        typeof req.customCao.minimumSalary !== 'number' ||
        !req.customCao.minimumSalary ||
        (req.customCao.substantiation && !req.customCao.substantiation.name)
      ) {
        validations.push('OFFER_CAO_INVALID')
      }
    } else {
      if (!req.salaryTableJobId) {
        validations.push('OFFER_SALARY_TABLE_JOB_INVALID')
      }
      if (!req.hoursInWorkweek) {
        validations.push('OFFER_HOURS_IN_WORKWEEK_INVALID')
      }
      // if (!req.advPerc) {
      //   validations.push('OFFER_HOURS_ADV_PERCENT_INVALID')
      // }
    }
  }

  return validations
}

const checkSignAbleContract = (signData, req = null, jobOffer = null) => {
  const { company, worker, manager, contractType, hiringCompany } = signData
  const validations = {
    worker: [],
    jobOffer: [],
    company: [],
    manager: [],
    hiringManager: [],
    hiringCompany: []
  }

  // validate company info
  validations.company = checkCompanyInSignAbleContract(company)
  // validate hiring company info
  validations.hiringCompany = checkHiringCompanyInSignAbleContract(
    hiringCompany
  )
  // validate manager info
  validations.manager = checkManagerInSignAbleContract(manager)

  // validate worker info
  if (worker.freelancer) {
    validations.worker = checkFreelancerInSignAbleContract(worker)
  } else {
    validations.worker = checkFlexWorkerInSignAbleContract(worker)
  }

  if (req && jobOffer) {
    validations.jobOffer = checkGeneralInfoInSignAbleContract(req, jobOffer)
    validations.jobOffer = validations.jobOffer.concat(
      checkTypeSpecificationInSignAbleContract({
        req,
        worker,
        contractType
      })
    )
  }

  const totalLength =
    validations.worker.length +
    validations.jobOffer.length +
    validations.company.length +
    validations.manager.length +
    validations.hiringCompany.length +
    validations.hiringManager.length

  return {
    signAble: totalLength === 0,
    validations
  }
}

const getFilteredJobOfferByLog = (jobOffer, user) => {
  if (jobOffer.logs && jobOffer.logs.length) {
    if (isAdmin(user) || isManager(user, jobOffer)) {
      return jobOffer
    }
    jobOffer.logs = jobOffer.logs.filter(
      log =>
        isEqualIDs(log.userId, user._id) || // user self
        // todo?: is it necessary to show logs of other hiring managers? when user isHiringManager
        ['expired', 'failed', 'active'].indexOf(log.title) >= 0
    )
    return jobOffer
  }
  return jobOffer
}

const getFilterAttachmentsByVisibility = (jobOffer, user) => {
  if (jobOffer.attachments && jobOffer.attachments.length) {
    if (isAdmin(user) || isManager(user, jobOffer)) {
      return jobOffer
    }

    if (isHiringManager(user, jobOffer)) {
      jobOffer.attachments = jobOffer.attachments.filter(
        d =>
          d.visibility &&
          d.visibility.indexOf(visibilityType.HIRING_COMPANY) >= 0
      )
    }

    if (isWorker(user, jobOffer)) {
      jobOffer.attachments = jobOffer.attachments.filter(
        d => d.visibility && d.visibility.indexOf(visibilityType.CANDIDATE) >= 0
      )
    }

    return jobOffer
  }
  return jobOffer
}

const getFilterContractVariables = (jobOffer, user) => {
  if (isAdmin(user) || isManager(user, jobOffer)) {
    return jobOffer
  } else if (isHiringManager(user, jobOffer)) {
    jobOffer.periodVariables.forEach(item => {
      delete item.hourlyWage
      delete item.brokerFee
      delete item.wage
      if (item.freelancerData) {
        // BIJLAGE_2
        delete item.freelancerData.BIJLAGE_2_VAT_INCLUDED
        delete item.freelancerData.BIJLAGE_2_HOURLY_RATE_FL_PC
        delete item.freelancerData.BIJLAGE_2_KOSTENVERGOEDINGEN
        delete item.freelancerData.BIJLAGE_2_VERGOEDINGEN_BETALINGSTERMIJN_MPC
        delete item.freelancerData.BIJLAGE_2_HOURS_PER_WEEK
        delete item.freelancerData.HULPMIDDEL_OMSCHRIJVING
        delete item.freelancerData.BIJLAGE_2_HULPMIDDEL_VERGOEDING
        delete item.freelancerData.BIJLAGE_2_HULPMIDDELEN_BETALINGSTERMIJN_MPC
        delete item.freelancerData.BIJLAGE_2_INKOOP_NUMMER
      }
    })
    return jobOffer
  } else if (isWorker(user, jobOffer)) {
    jobOffer.periodVariables.forEach(item => {
      // payRate
      delete item.brokerFee
      delete item.payRate
      // termOfPayment
      delete item.termOfPayment
      if (item.freelancerData) {
        delete item.freelancerData.BIJLAGE_2_HOURLY_RATE_FL_PC
        delete item.freelancerData.BIJLAGE_3_HOURLY_RATE_PC_HC
        // BIJLAGE_3
        delete item.freelancerData.BIJLAGE_3_BETALINGSTERMIJN
        delete item.freelancerData.BIJLAGE_3_HOURS_PER_WEEK
        delete item.freelancerData.BIJLAGE_3_INKOOP_NUMMER
      }
    })
  }

  return jobOffer
}

const reduceJobOffer = (jobOffer, user) => {
  jobOffer = getFilteredJobOfferByLog(jobOffer, user)
  jobOffer = getFilterAttachmentsByVisibility(jobOffer, user)

  return getFilterContractVariables(jobOffer, user)
}

const extractJobOfferMutableData = jobOffer => {
  const {
    hoursPerWeek,
    wage,
    hourlyWage,
    travelDistanceExpenseRate,
    travelDistanceExpenseForOneWay,
    travelHoursPerWeek,
    otherExpenses,
    otherExpensesType,
    otherExpensesUnit,
    payRate,
    termOfPayment,
    brokerFee,
    chargeTravelDistanceExpenses,
    chargeTravelHoursExpenses,
    chargeOtherExpenses,
    chargeWorkLogExpenses,
    germanData,
    freelancerData
  } = jobOffer

  return {
    hoursPerWeek,
    wage,
    hourlyWage,
    travelDistanceExpenseRate,
    travelDistanceExpenseForOneWay,
    travelHoursPerWeek,
    otherExpenses,
    otherExpensesType,
    otherExpensesUnit,
    payRate,
    termOfPayment,
    brokerFee,
    chargeTravelDistanceExpenses,
    chargeTravelHoursExpenses,
    chargeOtherExpenses,
    chargeWorkLogExpenses,
    germanData: germanData
      ? {
          payScale: germanData.payScale,
          standardAllowance: germanData.standardAllowance,
          assignmentTime: germanData.assignmentTime
        }
      : null,
    freelancerData: freelancerData
      ? {
          BEMIDDELING_COMP_AMOUNT: freelancerData.BEMIDDELING_COMP_AMOUNT,
          VOORFINANCIERING_OPTIONAL: freelancerData.VOORFINANCIERING_OPTIONAL,
          BIJLAGE_2_HOURLY_RATE_FL_PC:
            freelancerData.BIJLAGE_2_HOURLY_RATE_FL_PC,
          BIJLAGE_2_HOURS_PER_WEEK: freelancerData.BIJLAGE_2_HOURS_PER_WEEK,
          BIJLAGE_2_HULPMIDDEL_VERGOEDING:
            freelancerData.BIJLAGE_2_HULPMIDDEL_VERGOEDING,
          BIJLAGE_3_HOURLY_RATE_PC_HC:
            freelancerData.BIJLAGE_3_HOURLY_RATE_PC_HC,
          BIJLAGE_3_HOURS_PER_WEEK: freelancerData.BIJLAGE_3_HOURS_PER_WEEK
        }
      : null
  }
}

const generateCompanyContractDoc = async ({ contractType, contractData }) => {
  const companyContractPath = `/uploads/contracts/company-${uuid.v4()}-${Date.now()}.pdf`
  await generateCompanyContract(
    contractType.companyContractTemplatePath,
    path.join(__dirname, `../..${companyContractPath}`),
    contractData
  )

  // update contract doc with intermediary status
  const companyContractFileStatus = fs.statSync(
    path.join(__dirname, `../..${companyContractPath}`)
  )
  return {
    name: getContractName(contractData, 'company'),
    path: companyContractPath,
    size: companyContractFileStatus.size // fileStatus.size
  }
}

const generateWorkerContractDoc = async ({ contractType, contractData }) => {
  const workerContractPath = `/uploads/contracts/worker-${uuid.v4()}-${Date.now()}.pdf`
  await generateWorkerContract(
    contractType.workerContractTemplatePath,
    path.join(__dirname, `../..${workerContractPath}`),
    contractData
  )
  const workerContractFileStatus = fs.statSync(
    path.join(__dirname, `../..${workerContractPath}`)
  )
  return {
    name: getContractName(contractData, 'worker'),
    path: workerContractPath,
    size: workerContractFileStatus.size // fileStatus.size
  }
}

const generateCompanyContractData = async (
  jobOffer,
  isWorkerSigned = false
) => {
  const data = {}
  const contractData = getContractData(jobOffer)
  const contractType = contractData.contractType

  if (!isDocusignContract(contractType)) {
    const _isWorkerSigned =
      isWorkerSigned ||
      jobOffer.contractSigned.findIndex(
        item => item.role === roleType.WORKER
      ) >= 0

    if (!isFreelancerContract(contractType) || _isWorkerSigned) {
      data[
        'contractData.companyContractDoc'
      ] = await generateCompanyContractDoc({
        contractType,
        contractData
      })

      if (isFreelancerContract(contractType)) {
        data[
          'contractData.workerContractDoc'
        ] = await generateWorkerContractDoc({
          contractType,
          contractData
        })
      }
    }
  }

  return setContractStatus(data, jobOffer, false)
}

const generateWorkerContractData = async (
  jobOffer,
  isHiringManagerSigned = false
) => {
  const data = {}
  const contractData = getContractData(jobOffer)
  const contractType = contractData.contractType

  if (!isDocusignContract(contractType)) {
    const _isHiringManagerSigned =
      isHiringManagerSigned ||
      jobOffer.contractSigned.findIndex(
        item => item.role === roleType.HIRING_MANAGER
      ) >= 0

    if (!isFreelancerContract(contractType) || _isHiringManagerSigned) {
      data['contractData.workerContractDoc'] = await generateWorkerContractDoc({
        contractType,
        contractData
      })

      if (isFreelancerContract(contractType)) {
        data[
          'contractData.companyContractDoc'
        ] = await generateCompanyContractDoc({
          contractType,
          contractData
        })
      }
    }

    // generate tax contract
    if (contractType.taxStatementTemplatePath) {
      const taxFilePath = `/uploads/contracts/tax-${uuid.v4()}-${Date.now()}.pdf`
      await generateTaxStatement(
        contractType.taxStatementTemplatePath,
        path.join(__dirname, `../..${taxFilePath}`),
        getTaxContractData(jobOffer)
      )

      const taxFileStatus = fs.statSync(
        path.join(__dirname, `../..${taxFilePath}`)
      )
      const taxAttachment = {
        userId: jobOffer.workerId,
        name: 'Loonbelastingverklaring.pdf',
        path: taxFilePath,
        size: taxFileStatus.size, // fileStatus.size,
        visibility: [visibilityType.CANDIDATE]
      }
      if (taxAttachment) {
        data.attachments = [taxAttachment]
      }
    }
  }

  return setContractStatus(data, jobOffer)
}

const getContractDocusignMappingTabs = ({ template, jobOffer }) => {
  const textTabs = []
  const contract = getDocusignContractData(jobOffer)
  if (template.documents && template.documents.length) {
    template.documents.forEach(document => {
      if (document.textTabs && document.textTabs.length) {
        document.textTabs.forEach(textTab => {
          const isExisting =
            textTabs.findIndex(item => item.tabLabel === textTab.tabLabel) >= 0
          if (!isExisting) {
            textTabs.push({
              tabLabel: textTab.tabLabel,
              value: contract[textTab.tabLabel] || '',
              locked: 'true'
            })
          }
        })
      }
    })
  }
  return textTabs
}

const getSalaryPDFHtml = (req, user) => {
  const {
    contractType,
    company,
    hiringCompany,
    paymentCompany,
    worker,
    paymentManager,
    hiringCompanyOwner,
    collectiveAgreement,
    salaryResponse,
    hoursInWorkweek,
    salaryTableName,
    salaryTableJobName,
    payscale,
    periodical,
    birthdate
  } = req
  let caoTextHtml = ''
  let duration_start = ''
  let duration_end = ''
  let active_per = ''
  let calculation_abu = ''
  let salary = ''
  let adv_perc = ''

  if (salaryResponse) {
    if (salaryResponse.cao) {
      caoTextHtml = salaryResponse.cao.cao_text_html
      duration_start = salaryResponse.cao.duration_start
      duration_end = salaryResponse.cao.duration_end
    }
    if (salaryResponse.salary_table) {
      active_per = salaryResponse.salary_table.active_per
      adv_perc = salaryResponse.salary_table.adv_perc
    }
    if (salaryResponse.salary) {
      calculation_abu = salaryResponse.salary.calculation_abu
      salary = salaryResponse.salary.salary
    }
  }
  let gegevens = `<p><b>Gegevens</b></p><hr style="border-top-color: black;" />`
  gegevens += `<table cellspacing="1" cellpadding="5"><tbody>`
  gegevens += `<tr><td>Naam werknemer</td><td>${fullNameFormatter(
    worker
  )}</td></tr>`
  gegevens += `<tr><td>Naam opdrachtgever</td><td>${hiringCompany.name}</td></tr>`
  gegevens += `<tr><td>Naam intermediair</td><td>${company.name}</td></tr>`
  gegevens += `</tbody></table>`
  gegevens += `<br />`

  let cao = `<p><b>Cao</b></p><hr style="border-top-color: black;" />`
  cao += `<table cellspacing="1" cellpadding="5"><tbody>`
  cao += `<tr><td>Cao</td><td>${collectiveAgreement.name}</td></tr>`
  cao += `<tr><td>Looptijd</td><td>${duration_start} - ${duration_end}</td></tr>`
  let yesNo
  if (user.locale === languageType.NL) {
    yesNo = collectiveAgreement.avv ? 'Ja' : 'Nee'
  } else {
    yesNo = collectiveAgreement.avv ? 'Yes' : 'No'
  }
  cao += `<tr><td>AVV</td><td>${yesNo}</td></tr>`
  cao += `<tr><td>Werkweek</td><td>${hoursInWorkweek || ''}</td></tr>`
  cao += `<tr><td>Laatste update</td><td>${active_per || ''}</td></tr>`
  cao += `<tr><td>Salaristabel</td><td>${salaryTableName || ''}</td></tr>`
  cao += `<tr><td>Functie</td><td>${salaryTableJobName || ''}</td></tr>`
  cao += `<tr><td>Functieschaal</td><td>${payscale || ''}</td></tr>`
  cao += `<tr><td>Periodiek</td><td>${periodical || ''}</td></tr>`
  cao += `<tr><td>Geboortedatum</td><td>${birthdate || ''}</td></tr>`
  cao += `<tr><td>ABU/NBBU berekeningswijze</td><td>${calculation_abu ||
    ''}</td></tr>`
  cao += `<tr><td>Datum</td><td>${toStandardDateString(new Date())}</td></tr>`
  cao += `</tbody></table>`
  cao += `<br />`

  let loon = `<p><b>Loon</b></p><hr style="border-top-color: black;" />`
  loon += `<table cellspacing="1" cellpadding="5"><tbody>`
  loon += `<tr><td>Basisloon</td><td>${convertCurrencyString(
    salary,
    2,
    currencyType.EUR,
    true
  )}</td></tr>`

  const adv = adv_perc && adv_perc > 0 ? (salary * adv_perc) / 100 : 0
  if (adv_perc && adv_perc > 0) {
    loon += `<tr><td>Adv ${adv_perc}%</td><td>${convertCurrencyString(
      adv,
      2,
      currencyType.EUR,
      true
    )}</td></tr>`
  }
  loon += `<tr><td>Bruto uurloon</td><td>${convertCurrencyString(
    salary + Number(adv),
    2,
    currencyType.EUR,
    true
  )}</td></tr>`
  loon += `</tbody></table>`
  loon += `<br />`

  const signatureHTML = isDocusignContract(contractType)
    ? ''
    : '<div style="width: 830px;margin-top: 10px; font-size: 15px; border: 1px solid">' +
      `<p style='margin: 0'>` +
      `Dit document is akkoord verklaard door ${fullNameFormatter(
        worker
      )} en gelijktijdig ondertekend met de overeenkomst.` +
      `</p>` +
      `<p style='margin: 0'>` +
      `Dit document is akkoord verklaard door ${fullNameFormatter(
        hiringCompanyOwner
      )} van ${
        hiringCompany.name
      } en gelijktijdig ondertekend met de overeenkomst.` +
      `</p>` +
      `<p style='margin: 0'>` +
      `Dit document is akkoord verklaard door ${fullNameFormatter(
        paymentManager
      )} van ${
        paymentCompany.name
      } en gelijktijdig ondertekend met de overeenkomst.` +
      `</p>` +
      `</div>`

  let htmlToInsert = gegevens + cao + loon
  htmlToInsert += '<br /><br /><br /><br /><br /><br />'
  if (caoTextHtml.includes('<body>')) {
    return caoTextHtml.replace(
      '<body>',
      `<body>${htmlToInsert}${signatureHTML}`
    )
  }
  return `<html><head><meta charset="UTF-8" /></head>
<body>${htmlToInsert}${caoTextHtml}<br /><br /><br />${signatureHTML}</body>
</html>`
}

const generateCaoHtml = async ({ req, signData, salaryResponse, user }) => {
  const htmlContent = getSalaryPDFHtml(
    {
      ...signData,
      salaryResponse,
      hoursInWorkweek: req.hoursInWorkweek,
      salaryTableName: signData.salaryTable.name,
      salaryTableJobName: signData.salaryTableJob.name,
      payscale: req.payscale,
      periodical: req.periodical,
      birthdate: toStandardDateString(signData.worker.birthday)
    },
    user
  )

  const caoFilePath = `/uploads/joboffers/cao-${uuid.v4()}-${Date.now()}.html`
  const fullPath = path.join(__dirname, `../..${caoFilePath}`)
  await fsExtra.writeFile(fullPath, htmlContent, 'utf8')
  const stats = fs.statSync(fullPath)
  return {
    userId: user._id,
    visibility: [visibilityType.HIRING_COMPANY, visibilityType.CANDIDATE],
    name: 'CAO onderbouwing.html',
    path: caoFilePath,
    size: stats.size,
    uploadedAt: new Date()
  }
}

const hasPaymentTemplate = jobOffer => {
  if (jobOffer && jobOffer.contractData && jobOffer.contractData.contractType) {
    const contractType = jobOffer.contractData.contractType
    return (
      contractType.name.toLowerCase().indexOf('by') > -1 &&
      !isEqualIDs(contractType.paymentCompanyId, jobOffer.companyId)
    )
  }
  return false
}

const getCAOAttachment = jobOffer => {
  if (jobOffer && jobOffer.attachments && jobOffer.attachments.length) {
    const attachments = sortBy(jobOffer.attachments, 'uploadedAt')
    return attachments.find(
      item =>
        item.name === 'CAO onderbouwing.pdf' ||
        item.name === 'CAO onderbouwing.html'
    )
  }
  return false
}

const existCompanyWithPaymentType = (company, allowedCompanyId) => {
  if (isEqualIDs(company._id, allowedCompanyId)) {
    return false
  }
  if (company.allowedCompanies && company.allowedCompanies.length) {
    return !company.allowedCompanies.filter(
      allowedCompany =>
        isEqualIDs(allowedCompany.companyId, allowedCompanyId) &&
        allowedCompany.type === companyAllowType.PAYMENT
    ).length
  }
  return true
}

const getContractStatus = (offer, user) => {
  const status = offer.status
  const intermediaryStatus = offer.intermediaryStatus
  if (user.role === roleType.WORKER) {
    return status
  }
  if (isHiringManager(user, offer)) {
    return intermediaryStatus
  }
  if (isEqualIDs(offer.companyId, offer.hiringCompanyId)) {
    return offer.status
  } else if (
    status === offerStateType.OPEN ||
    intermediaryStatus === offerStateType.OPEN
  ) {
    return offerStateType.OPEN
  } else if (
    status === offerStateType.PENDING ||
    intermediaryStatus === offerStateType.PENDING
  ) {
    return offerStateType.PENDING
  } else if (
    status === offerStateType.ACTIVE &&
    intermediaryStatus === offerStateType.ACTIVE
  ) {
    return offerStateType.ACTIVE
  } else if (
    status === offerStateType.COMPLETED &&
    intermediaryStatus === offerStateType.COMPLETED
  ) {
    return offerStateType.COMPLETED
  } else if (
    status === offerStateType.EXPIRED ||
    intermediaryStatus === offerStateType.EXPIRED
  ) {
    return offerStateType.EXPIRED
  } else if (
    status === offerStateType.NOT_ACTIVE ||
    intermediaryStatus === offerStateType.NOT_ACTIVE
  ) {
    return offerStateType.NOT_ACTIVE
  } else if (
    status === offerStateType.DECLINED ||
    intermediaryStatus === offerStateType.DECLINED
  ) {
    return offerStateType.DECLINED
  }
}

const isContractSigned = (offer, user) => {
  const status = getContractStatus(offer, user)

  const statusArray = [
    offerStateType.ACTIVE,
    offerStateType.COMPLETED,
    offerStateType.NOT_ACTIVE,
    offerStateType.EXPIRED
  ]
  return statusArray.indexOf(status) >= 0
}

const isReviewRequiredByPM = (req, signData) => {
  const { company, paymentCompany, contractType } = signData
  if (isEqualIDs(company._id, paymentCompany._id)) {
    return false
  }

  if (req.workerAcceptsWithoutSigning) {
    return true
  }

  if (company.viewOfferByPaymentManager === viewOfferType.DISABLE_OFFER) {
    return false
  } else if (company.viewOfferByPaymentManager === viewOfferType.ALL_OFFER) {
    return true
  } else if (company.viewOfferByPaymentManager === viewOfferType.ET_OFFER) {
    const etValue =
      Number(req.exchangeHousing || 0) +
      Number(req.exchangeOtherExpense || 0) +
      Number(req.healthInsuranceDeduction || 0)
    return !(isFreelancerContract(contractType) || etValue <= 0)
  }

  return false
}

const getOfferDataToExcel = (rows, user, isPayment) => {
  const link = `${frontendUrl}/${user.role}/dashboard/joboffers/`
  const json = []
  rows.forEach(item => {
    const { periodVariable } = getPeriodVariable(item)
    const data = item.contractData

    // get route
    let isIntermediary
    let isHiring
    if (isPayment) {
      isIntermediary = !isEqualIDs(item.companyId, item.hiringCompanyId)
    } else {
      isIntermediary =
        !isEqualIDs(item.companyId, item.hiringCompanyId) &&
        isEqualIDs(user.companyId, item.companyId)
      isHiring =
        !isEqualIDs(item.companyId, item.hiringCompanyId) &&
        !isEqualIDs(user.companyId, item.companyId)
    }
    const hiringLink = isHiring ? '/hiring-company' : ''
    const intermediaryLink = isIntermediary ? '/intermediary' : ''
    const paymentLink = isPayment ? `payment/` : ''

    // in case of freelancer contract
    let compensationRate = periodVariable.hourlyWage
    let invoiceRate = periodVariable.payRate
    let contractHours = periodVariable.hoursPerWeek
    if (
      data &&
      data.contractType &&
      isFreelancerContract(data.contractType) &&
      periodVariable.freelancerData
    ) {
      compensationRate =
        periodVariable.freelancerData.BIJLAGE_2_HOURLY_RATE_FL_PC
      invoiceRate = periodVariable.freelancerData.BIJLAGE_3_HOURLY_RATE_PC_HC
      contractHours = periodVariable.freelancerData.BIJLAGE_2_HOURS_PER_WEEK
    }

    const row = {
      candidateName: item.worker ? fullNameFormatter(item.worker) : '',
      hiringCompany: item.hiringCompany ? item.hiringCompany.name : '',
      hiringManager: item.hiringManager
        ? fullNameFormatter(item.hiringManager)
        : '',
      intermediaryCompany: item.company ? item.company.name : '',
      intermediaryManager: item.manager ? fullNameFormatter(item.manager) : '',
      contractType: data && data.contractType ? data.contractType.name : '',
      cao:
        data && data.collectiveAgreement ? data.collectiveAgreement.name : '',
      startDate: convertExcelDateFormat(item.startDate),
      endDate: convertExcelDateFormat(item.endDate),
      modifiedDate: convertExcelDateFormat(item.updatedAt),
      status: convertStatus(item.status),
      invoiceRate,
      contractHours,
      compensationRate,
      offerLink: link + paymentLink + item._id + hiringLink + intermediaryLink
    }
    json.push(row)
  })
  return json
}

const getOfferVariables = (startDate, worker = {}) => {
  const variables = {
    cola: 0,
    deduction: 0,
    prefinancingPercentage: 0
  }
  if (worker.permanentAddress && worker.permanentAddress.country) {
    const countryItem = countries.find(
      item => item.name === worker.permanentAddress.country
    )
    const colaItems = colaValues.filter(item => item.code === countryItem.code)
    if (colaItems && colaItems.length) {
      const sortedColas = colaItems.sort((a, b) => {
        return new Date(b.date) - new Date(a.date)
      })
      const colaItem = sortedColas.find(
        item => new Date(startDate) >= new Date(item.date)
      )
      if (colaItem) {
        variables.cola = colaItem.value
      }
    }
  }
  const sortedDeductions = deductionValues.sort((a, b) => {
    return new Date(b.date) - new Date(a.date)
  })
  const deductionItem = sortedDeductions.find(
    item => new Date(startDate) >= new Date(item.date)
  )
  if (deductionItem) {
    variables.deduction = deductionItem.value
  }

  const sortedPrefinancingPercentages = prefinancingPercentages.sort((a, b) => {
    return new Date(b.date) - new Date(a.date)
  })
  const percentageItem = sortedPrefinancingPercentages.find(
    item => new Date(startDate) >= new Date(item.date)
  )
  if (percentageItem) {
    variables.prefinancingPercentage = percentageItem.value
  }
  return variables
}

const getJobOfferLog = (action, log, before) => {
  if (action === offerStateType.DECLINED && before.description) {
    log.description = before.description
  }
  if (action === 'reject' && before.comment) {
    log.description = before.comment
  }
  if (action === 'period') {
    log.mode = before.mode
    log.periodNumber = before.periodNumber
  }
  return log
}

module.exports = {
  getJobOfferDeleteCode,
  getTaxContractData,
  generateJobOfferData,
  getPeriodVariable,
  getContractData,
  getDocusignContractData,
  getContractName,
  getInitialSignData,
  getContractDocusignMappingTabs,
  checkOverlappingDates,
  checkSignAbleContract,
  isBrokerCompany,
  isDocusignContract,
  isFreelancerContract,
  isOfflineContract,
  getFreelancerData,
  extractJobOfferMutableData,
  reduceJobOffer,
  generateWorkerContractData,
  generateCompanyContractData,
  hasPaymentTemplate,
  getCAOAttachment,
  existCompanyWithPaymentType,
  generateWorkerContractDoc,
  generateCompanyContractDoc,
  getSalaryPDFHtml,
  generateCaoHtml,
  isAdmin,
  isManager,
  checkGeneralInfoInSignAbleContract,
  checkTypeSpecificationInSignAbleContract,
  getOfferDataToExcel,
  getContractStatus,
  isContractSigned,
  isReviewRequiredByPM,
  getOfferVariables,
  getJobOfferLog,
  setContractStatus
}
