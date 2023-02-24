/**
 * @param req
 */
const serializeDaemonData = req => {
  if (req.isWeek) {
    req.dayOfMonth = {
      isAsterisk: true,
      isSteps: false,
      asterisk: '*',
      ranges: [],
      steps: null
    }
  } else {
    req.dayOfWeek = {
      isAsterisk: true,
      isSteps: false,
      asterisk: '*',
      ranges: [],
      steps: null
    }
  }
  return req
}

module.exports = {
  serializeDaemonData
}
