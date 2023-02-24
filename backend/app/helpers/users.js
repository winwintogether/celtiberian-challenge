const {
  countries,
  euCountries,
  europeanFreeTradeAssociation
} = require('../../config/constants')
const {
  roleType,
  verificationDetailType,
  verificationStatusType,
  verificationDetailStatusType,
  languageType,
  userSectionType
} = require('../../config/types')
const {
  isEqualIDs,
  buildErrObject,
  fullNameFormatter,
  toNLDateString,
  convertExcelDateFormat,
  convertStatus
} = require('./utils')
const { frontendUrl } = require('../../config/vars')

const isFreelancer = (value, { req }) => req.body.freelancer

const isNotFreelancer = (...args) => !isFreelancer(...args)

const isWorker = (value, { req }) => req.body.role === roleType.WORKER

const isGonnaWorkInNl = (value, { req }) =>
  req.body.gonnaWorkIn === 'Netherlands'

const isNotFromNL = (value, { req }) => req.body.nationality !== 'Netherlands'

const isFromNL = (value, { req }) => req.body.nationality === 'Netherlands'

const isTemporaryCountryNetherlands = (value, { req }) =>
  req.body.country === 'Netherlands'

const isNotTemporaryCountryNetherlands = (value, { req }) =>
  req.body.country !== 'Netherlands'

const isPermanentCountryNetherlands = (value, { req }) =>
  req.body.permanentAddress.country === 'Netherlands'

const isNotPermanentCountryNetherlands = (value, { req }) =>
  req.body.permanentAddress.country !== 'Netherlands'

const isRegisteredInNetherlands = (value, { req }) =>
  req.body.freelancerData.registeredInNetherlands

const isNotRegisteredInNetherlands = (...args) =>
  !isRegisteredInNetherlands(...args)

const isGonnaWorkInGermany = (value, { req }) =>
  req.body.gonnaWorkIn && req.body.gonnaWorkIn === 'Germany'

const canBePermanentAddressCountry = country =>
  countries
    .filter(({ name }) => name !== 'Netherlands')
    .map(({ name }) => name)
    .includes(country)

const isPermissionRequired = country =>
  ![...euCountries, ...europeanFreeTradeAssociation].includes(country)

const isWorkPermitRequired = (value, { req }) =>
  isPermissionRequired(req.body.nationality)

const getAllowedUserIds = (jobOffers, allowedIds = []) => {
  if (jobOffers && jobOffers.length) {
    jobOffers.forEach(jobOffer => {
      if (
        allowedIds.findIndex(workerId =>
          isEqualIDs(workerId, jobOffer.workerId)
        ) < 0
      ) {
        allowedIds.push(jobOffer.workerId)
      }
    })
  }
  return allowedIds
}

const deleteProfileInformation = user => {
  const {
    birthPlace,
    professionId,
    nationality,
    socialSecurityNumber,
    gonnaWorkIn,
    overview,
    ...rest
  } = user
  return rest
}

const deleteBankAccount = user => {
  const { bankName, bankNumber, bankAccountHolderName, bic, ...rest } = user
  return rest
}

const deleteOtherInfo = user => {
  const {
    bsn,
    bsnProofFrontImage,
    bsnProofBackImage,
    CV,
    experiences,
    educations,
    skills,
    languages,
    certifications,
    ...rest
  } = user
  return rest
}

const deleteCompanyInfo = user => {
  const {
    freelancerData,
    permanentAddress,
    workPermit,
    workingAs,
    preferredNetSalary,
    maritalStatus,
    religion,
    birthName,
    workedInGermany,
    ...rest
  } = user
  return rest
}

const deleteIdentification = user => {
  const {
    identificationType,
    identificationNumber,
    identificationExpirationDate,
    idFrontImage,
    idBackImage,
    ...rest
  } = user
  return rest
}

const serializeUserData = user => {
  let result = { ...user }
  if (result.role !== roleType.WORKER) {
    result = deleteProfileInformation(result)
    result = deleteBankAccount(result)
    result = deleteOtherInfo(result)
    result = deleteCompanyInfo(result)
    if (result.role === roleType.ADMIN) {
      result = deleteIdentification(result)
    }
  }
  if (user.section === userSectionType.PERSONAL_INFORMATION) {
    result.fullName = fullNameFormatter(result)
  }
  return result
}

const getChangedVerificationDetail = (before, after) => {
  const beforeDetails = before.verificationData
    ? before.verificationData.details
    : []
  const afterDetails = after.verificationData
    ? after.verificationData.details
    : []

  return afterDetails.find(AItem => {
    const typeSameDetail = beforeDetails.find(item => item.type === AItem.type)

    if (!typeSameDetail) {
      return true
    }
    return typeSameDetail.status !== AItem.status
  })
}

const checkVerificationEnable = (before, after) => {
  const differentVerification = getChangedVerificationDetail(before, after)
  if (differentVerification) {
    // id
    if (
      differentVerification.type === verificationDetailType.ID &&
      (!before.identificationType ||
        !before.identificationNumber ||
        !before.identificationExpirationDate ||
        !before.idFrontImage ||
        !before.idFrontImage.path ||
        !before.idBackImage ||
        !before.idBackImage.path)
    ) {
      throw buildErrObject(422, 'USER_VERIFICATION_NOT_UPDATED')
    }
    // bsn
    if (differentVerification.type === verificationDetailType.BSN) {
      if (
        before.role === roleType.WORKER &&
        !before.freelancer &&
        before.nationality !== 'Netherlands' &&
        before.gonnaWorkIn === 'Netherlands'
      ) {
        if (
          !before.bsn ||
          !before.bsnProofFrontImage ||
          !before.bsnProofFrontImage.path ||
          !before.bsnProofBackImage ||
          !before.bsnProofBackImage.path
        ) {
          throw buildErrObject(422, 'USER_VERIFICATION_NOT_UPDATED')
        }
      } else if (!before.bsn) {
        throw buildErrObject(422, 'USER_VERIFICATION_NOT_UPDATED')
      }
    }
    // company details
    if (
      before.freelancer &&
      differentVerification.type === verificationDetailType.COMPANY_DETAILS
    ) {
      const freelancerData = before.freelancerData
      if (freelancerData && freelancerData.registeredInNetherlands) {
        if (
          !freelancerData.companyName ||
          !freelancerData.BTW ||
          !freelancerData.kvkNumber ||
          !freelancerData.kvkExtract ||
          !freelancerData.kvkExtract.path ||
          !freelancerData.kvkExtractDate ||
          !freelancerData.liabilityInsurance ||
          !freelancerData.liabilityInsurance.path
        ) {
          throw buildErrObject(422, 'USER_VERIFICATION_NOT_UPDATED')
        }
      } else if (
        !freelancerData.companyName ||
        !freelancerData.BTW ||
        !freelancerData.A1certificate ||
        !freelancerData.A1certificate.path ||
        !freelancerData.A1certificateExpirationDate
      ) {
        throw buildErrObject(422, 'USER_VERIFICATION_NOT_UPDATED')
      }
    }

    // rp
    if (
      differentVerification.type === verificationDetailType.RP &&
      (!before.workPermit.idNumber ||
        !before.workPermit.expirationDate ||
        !before.workPermit.docType ||
        !before.workPermit.imageFront ||
        !before.workPermit.imageRear ||
        !before.workPermit.imageFront.path ||
        !before.workPermit.imageRear.path)
    ) {
      throw buildErrObject(422, 'USER_VERIFICATION_NOT_UPDATED')
    }
  } else {
    throw buildErrObject(422, 'USER_VERIFICATION_NOT_UPDATED')
  }
}

const getVerificationStatus = (profile, user) => {
  if (
    profile.section === userSectionType.PERSONAL_INFORMATION &&
    ((isEqualIDs(profile.companyId, user.companyId) &&
      user.role === roleType.MANAGER) ||
      user.role === roleType.ADMIN)
  ) {
    let types = []
    if (profile.freelancer) {
      types = [verificationDetailType.COMPANY_DETAILS]
    } else {
      types = [verificationDetailType.ID]
      if (profile.gonnaWorkIn === 'Netherlands') {
        types = types.concat([verificationDetailType.BSN])
      }
    }

    if (isWorkPermitRequired(profile.workPermit, { req: { body: profile } })) {
      types = types.concat([verificationDetailType.RP])
    }
    let count = 0
    if (
      profile.verificationData &&
      profile.verificationData.details &&
      profile.verificationData.details.length
    ) {
      profile.verificationData.details.forEach(item => {
        if (
          types.includes(item.type) &&
          item.status === verificationDetailStatusType.VERIFIED
        ) {
          count += 1
        }
      })
    }

    if (profile.verificationData) {
      if (types.length === count) {
        profile.verificationData.status = verificationStatusType.FULLY_VERIFIED
      } else if (count > 0) {
        profile.verificationData.status = verificationStatusType.PARTLY_VERIFIED
      } else {
        profile.verificationData.status = verificationStatusType.UN_VERIFIED
      }
    }
    return profile.verificationData
  }
  return profile.verificationData
}

const checkCanUpdateProfile = (profile, req) => {
  if (profile.role === roleType.WORKER && profile.verificationData) {
    if (
      req.section === userSectionType.PERSONAL_INFORMATION &&
      profile.verificationData.status &&
      profile.verificationData.status !== verificationStatusType.UN_VERIFIED
    ) {
      throw buildErrObject(422, 'PROFILE_NOT_UNVERIFIED')
    }

    if (
      profile.verificationData.details &&
      profile.verificationData.details.length
    ) {
      if (req.section === userSectionType.DOCUMENTS_OF_IDENTIFICATION) {
        const idItem = profile.verificationData.details.find(
          item => item.type === verificationDetailType.ID
        )
        if (idItem && idItem.status === verificationDetailStatusType.VERIFIED) {
          throw buildErrObject(422, 'PROFILE_NOT_UNVERIFIED')
        }
      }
      if (req.section === userSectionType.INFO_REQUIRED_NETHERLANDS) {
        const idItem = profile.verificationData.details.find(
          item => item.type === verificationDetailType.BSN
        )
        if (idItem && idItem.status === verificationDetailStatusType.VERIFIED) {
          throw buildErrObject(422, 'PROFILE_NOT_UNVERIFIED')
        }
      }
      if (req.section === userSectionType.WORK_PERMIT) {
        const idItem = profile.verificationData.details.find(
          item => item.type === verificationDetailType.RP
        )
        if (idItem && idItem.status === verificationDetailStatusType.VERIFIED) {
          throw buildErrObject(422, 'PROFILE_NOT_UNVERIFIED')
        }
      }
      if (req.section === userSectionType.COMPANY_DETAILS) {
        const idItem = profile.verificationData.details.find(
          item => item.type === verificationDetailType.COMPANY_DETAILS
        )
        if (idItem && idItem.status === verificationDetailStatusType.VERIFIED) {
          throw buildErrObject(422, 'PROFILE_NOT_UNVERIFIED')
        }
      }
    }
  }
  if (
    profile.role === roleType.WORKER &&
    req.section === userSectionType.BANK_ACCOUNT &&
    req.isActiveContract
  ) {
    throw buildErrObject(422, 'USER_HAVE_ACTIVE_CONTRACT')
  }
}

const expiringCandidateDocumentInfo = user => {
  const userContent = []
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 30)

  if (
    user.identificationExpirationDate &&
    new Date(user.identificationExpirationDate) < new Date(endDate)
  ) {
    userContent.push({
      companyId: user.companyId,
      fullName: fullNameFormatter(user),
      documentType: verificationDetailType.ID.toUpperCase(),
      expirationDate: toNLDateString(user.identificationExpirationDate)
    })
  }
  if (
    user.workPermit &&
    user.workPermit.expirationDate &&
    new Date(user.workPermit.expirationDate) < new Date(endDate)
  ) {
    userContent.push({
      companyId: user.companyId,
      fullName: fullNameFormatter(user),
      documentType: verificationDetailType.RP.toUpperCase(),
      expirationDate: toNLDateString(user.workPermit.expirationDate)
    })
  }

  return userContent
}

const getUserName = (data, title) => {
  if (data && data.length) {
    const users = data.filter(item => item.title === title)
    if (users && users.length) {
      if (users.length === 1) {
        return users[0].userName
      }
      const sortedUsers = users.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
      return sortedUsers[0].userName
    }
    return ''
  }
  return ''
}

const getCandidatesDataToExcel = (rows, user, isPayment) => {
  const link = `${frontendUrl}/manager/dashboard/profile/`
  const json = []

  rows.forEach(item => {
    const row = {
      candidateName: fullNameFormatter(item),
      emailAddress: item.email,
      createdAt: convertExcelDateFormat(item.createdAt),
      updatedAt: convertExcelDateFormat(item.updatedAt),
      status: convertStatus(item.status),
      birthday: convertExcelDateFormat(item.birthday),
      nationality: item.nationality,
      bankName: item.bankName,
      bankAccountHolderName: item.bankAccountHolderName,
      IBAN: item.bankNumber,
      intermediaryCompany: item.company ? item.company.name : '',
      language: (item.language || languageType.EN).toUpperCase(),
      workCountry: item.gonnaWorkIn,
      permanentAddressCountry:
        item.permanentAddress && item.permanentAddress.country,
      permanentAddressCity:
        (item.permanentAddress && item.permanentAddress.city) || '',
      permanentAddressPostcode:
        (item.permanentAddress && item.permanentAddress.postalCode) || '',
      temporaryAddressCountry: item.country,
      temporaryAddressPostcode: item.city,
      temporaryAddressCity: item.postalCode,
      socialSecurityNumber: item.socialSecurityNumber,
      BSN: item.bsn,
      identificationNumber: item.identificationNumber,
      identificationExpirationDate:
        convertExcelDateFormat(item.identificationExpirationDate) || '',
      workPermitID: (item.workPermit && item.workPermit.idNumber) || '',
      workPermitExpirationDate:
        (item.workPermit &&
          convertExcelDateFormat(item.workPermit.expirationDate)) ||
        '',
      tags: item.tags && item.tags.length > 0 ? item.tags.join('|') : '',
      VerificationStatus:
        item.verificationData && item.verificationData.status
          ? convertStatus(item.verificationData.status)
          : convertStatus(verificationStatusType.UN_VERIFIED),
      candidateLink: isPayment
        ? `${link}payment/${item._id}`
        : `${link + user.companyId}/${item._id}`
    }
    json.push(row)
  })
  return json
}

const getUserSectionInfo = user => {
  const data = { ...user }
  if (data.freelancerData) {
    const flData = data.freelancerData
    if (flData.companyName) {
      data['freelancerData.companyName'] = flData.companyName
    }
    if (flData.BTW) {
      data['freelancerData.BTW'] = flData.BTW
    }
    if (typeof flData.registeredInNetherlands === 'boolean') {
      data['freelancerData.registeredInNetherlands'] =
        flData.registeredInNetherlands
    }
    if (flData.registeredInNetherlands) {
      if (flData.kvkNumber) {
        data['freelancerData.kvkNumber'] = flData.kvkNumber
      }
      if (flData.kvkExtract) {
        data['freelancerData.kvkExtract'] = flData.kvkExtract
      }
      if (flData.kvkExtractDate) {
        data['freelancerData.kvkExtractDate'] = flData.kvkExtractDate
      }
      if (flData.liabilityInsurance) {
        data['freelancerData.liabilityInsurance'] = flData.liabilityInsurance
      }
    } else {
      if (flData.A1certificate) {
        data['freelancerData.A1certificate'] = flData.A1certificate
      }
      if (flData.A1certificateExpirationDate) {
        data['freelancerData.A1certificateExpirationDate'] =
          flData.A1certificateExpirationDate
      }
    }
    delete data.freelancerData
  }
  return data
}

module.exports = {
  isFreelancer,
  isNotFreelancer,
  isWorker,
  isGonnaWorkInNl,
  isNotFromNL,
  isFromNL,
  isTemporaryCountryNetherlands,
  isNotTemporaryCountryNetherlands,
  isPermanentCountryNetherlands,
  isNotPermanentCountryNetherlands,
  isRegisteredInNetherlands,
  isNotRegisteredInNetherlands,
  isGonnaWorkInGermany,
  canBePermanentAddressCountry,
  isPermissionRequired,
  isWorkPermitRequired,
  getAllowedUserIds,
  serializeUserData,
  getVerificationStatus,
  getChangedVerificationDetail,
  checkVerificationEnable,
  checkCanUpdateProfile,
  expiringCandidateDocumentInfo,
  getUserName,
  getCandidatesDataToExcel,
  getUserSectionInfo
}
