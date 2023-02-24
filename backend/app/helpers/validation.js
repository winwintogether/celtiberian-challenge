exports.isValidPassword = password => {
  let condition = 0
  if (!new RegExp(/^(?=.{8,}$).*$/).test(password)) {
    return false
  }
  if (new RegExp(/^(?=.*?[a-z]).*$/).test(password)) {
    condition += 1
  }
  if (new RegExp(/^(?=.*?[A-Z]).*$/).test(password)) {
    condition += 1
  }
  if (new RegExp(/^(?=.*?[0-9]).*$/).test(password)) {
    condition += 1
  }
  if (new RegExp(/^(?=.*?\W).*$/).test(password)) {
    condition += 1
  }
  return condition >= 2
}

exports.isSofiNumber = ssn => {
  if (ssn.length !== 9) {
    return false
  }

  let total = 0
  for (let i = 0; i < 8; i++) {
    total += parseInt(ssn[i]) * (9 - i)
  }

  return total % 11 === parseInt(ssn[8])
}
