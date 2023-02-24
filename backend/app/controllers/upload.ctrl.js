/**
 * Path
 */
exports.upload = path => (req, res) => {
  return res.status(200).json({
    path: `${path}/${req.file.filename}`
  })
}
