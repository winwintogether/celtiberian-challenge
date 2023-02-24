/**
 *  Calculate distance between two coordinates
 *
 * @param point1 // latitude, longitude
 * @param point2 // latitude, longitude
 */
exports.getCoordinatesDistance = (point1, point2) => {
  if (point1 && point2) {
    const lat1 = point1.latitude
    const lon1 = point1.longitude
    const lat2 = point2.latitude
    const lon2 = point2.longitude

    if (!lat1 || !lon1 || !lat2 || !lon2) {
      return null
    }

    if (lat1 === lat2 && lon1 === lon2) {
      return 0
    }

    const radLat1 = (Math.PI * lat1) / 180
    const radLat2 = (Math.PI * lat2) / 180
    const theta = lon1 - lon2
    const radTheta = (Math.PI * theta) / 180
    let dist =
      Math.sin(radLat1) * Math.sin(radLat2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.cos(radTheta)
    if (dist > 1) {
      dist = 1
    }
    dist = Math.acos(dist)
    dist = (dist * 180) / Math.PI
    dist = dist * 60 * 1.1515

    // kilometers
    dist *= 1.609344
    return Math.floor(dist)
  }
  return null
}
