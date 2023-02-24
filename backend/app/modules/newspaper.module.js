const { findPublishersByIds } = require('../services/publishers.service')
const { isEqualIDs } = require('../helpers/utils')

exports.processPaginationNews = async news => {
  const publisherIds = []
  news.forEach(item => {
    publisherIds.push(item.publisherId)
  })
  const publishers = await findPublishersByIds(publisherIds)
  return news.map(user => {
    user.publisher = publishers.find(item =>
      isEqualIDs(item._id, user.publisherId)
    )
    return user
  })
}
