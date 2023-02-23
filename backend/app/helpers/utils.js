/**
 *
 * @param success
 * @param msg
 */
exports.consoleLogWrapper = (success, msg) => {
  if (success) {
    console.log('*******************  Info **********************')
  } else {
    console.log('******************* Error **********************')
  }
  console.log(`>>>> ${msg}`)
  console.log('************************************************')
}
