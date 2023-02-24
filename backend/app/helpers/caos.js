/**
 * @param company
 * @param allowedCompanies
 */
const getAllowedCaoIds = (company, allowedCompanies) => {
  let caoIds = []
  if (company.caoIds) {
    caoIds = [...company.caoIds]
  }
  for (const allowedCompany of allowedCompanies) {
    if (allowedCompany.caoIds && allowedCompany.caoIds.length) {
      const uniqueCaoId = allowedCompany.caoIds.find(
        caoId => !caoIds.includes(caoId)
      )
      if (uniqueCaoId) {
        caoIds.push(uniqueCaoId)
      }
    }
  }
  return caoIds
}

module.exports = {
  getAllowedCaoIds
}
