/**
 * generate Contract Footer
 * @param doc
 * @param data
 * @param type
 */
const generateFooter = (doc, data, type = 'company') => {
  const {
    worker,
    hiringCompany,
    hiringManager,
    paymentCompany,
    paymentManager,
    sign
  } = data
  let text
  if (type === 'company') {
    text = `Digitaal ondertekend door ${hiringManager.fullName} op ${sign.hiringManager.date} vanaf ${sign.hiringManager.ip} te ${hiringCompany.city}\nDigitaal ondertekend door ${paymentManager.fullName} op ${sign.manager.date} vanaf ${sign.manager.ip} te ${paymentCompany.city}`
  } else {
    text = `Digitaal ondertekend door ${worker.fullName} op ${sign.worker.date} vanaf ${sign.worker.ip} te ${worker.city}\nDigitaal ondertekend door ${paymentManager.fullName} op ${sign.manager.date} vanaf ${sign.manager.ip} te ${paymentCompany.city}`
  }
  const footerX = doc.x
  const footerX1 = footerX + 10
  doc.fontSize(8).lineGap(3)
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    doc.text(text, footerX1, doc.page.height - 35, {
      height: 30
    })
    doc.rect(footerX, doc.page.height - 40, 450, 30).stroke()
  }
}

/**
 * Handle X Position of PDF
 *
 * @param doc
 * @param str
 * @param positionX
 * @param reset
 * @returns {*}
 */
const setPosX = (doc, str, positionX, reset = false) => {
  const lineBreakPoint = doc.page.width - doc.page.margins.right

  if (reset) {
    positionX = doc.x
  }

  if (positionX + doc.widthOfString(str) <= lineBreakPoint) {
    positionX += doc.widthOfString(str)
    return positionX
  }

  const wordArr = str.split(' ')

  for (let i = 0; i < wordArr.length; i++) {
    positionX += doc.widthOfString(`${wordArr[i]} `)

    if (positionX > lineBreakPoint && wordArr[i] !== '') {
      positionX = doc.x + doc.widthOfString(wordArr[i])
    }
  }
  return positionX
}

module.exports = {
  setPosX,
  generateFooter
}
