const faker = require('faker')
const ObjectID = require('mongodb').ObjectID

module.exports = [
  {
    _id: new ObjectID('60345ea042615d4b14c17a8d'),
    id: 1,
    name: faker.random.word(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent()
  },
  {
    _id: new ObjectID('60345ea042615d4b14c17a8c'),
    name: faker.random.word(),
    id: 2,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent()
  },
  {
    _id: new ObjectID('60345ea042615d4b14c17a8b'),
    name: faker.random.word(),
    id: 3,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent()
  }
]
