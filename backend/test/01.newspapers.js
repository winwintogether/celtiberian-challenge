const faker = require('faker')
const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../server')
// eslint-disable-next-line no-unused-vars
const should = chai.should()

chai.use(chaiHttp)
const createdID = []

describe('*********** Newspaper ***********', () => {
  describe('/GET newspapers', () => {
    it('it should GET the newspapers', done => {
      chai
        .request(server)
        .get('/api/newspapers')
        .set('Authorization', `Bearer`)
        .end((err, res) => {
          res.should.have.status(200)
          res.body.should.be.an('object')
          res.body.docs.should.be.a('array')
          done()
        })
    })
  })
  describe('/POST newspapers', () => {
    it('it should POST a payment company', done => {
      const newspaper = {
        title: faker.random.word(),
        link: faker.internet.url(),
        publisherId: '60345ea042615d4b14c17a8d',
        abstract: faker.random.words(),
        languages: ['English']
      }
      chai
        .request(server)
        .post('/api/newspapers')
        .set('Authorization', `Bearer`)
        .send(newspaper)
        .end((err, res) => {
          res.should.have.status(201)
          res.body.should.be.a('object')
          createdID.push(res.body._id)
          done()
        })
    })
  })
  describe('/PATCH/:id newspapers', () => {
    it('it should UPDATE a newspaper given by the id', done => {
      const id = createdID.slice(-1).pop()

      const company = {
        title: faker.random.word(),
        link: faker.internet.url(),
        publisherId: '60345ea042615d4b14c17a8d',
        abstract: faker.random.words(),
        languages: ['English']
      }

      chai
        .request(server)
        .patch(`/api/newspapers/${id}`)
        .set('Authorization', `Bearer`)
        .send(company)
        .end((error, res) => {
          res.should.have.status(200)
          res.body.should.be.a('object')
          res.body.should.have.property('_id').eql(id)
          done()
        })
    })
  })
  describe('/DELETE/:id newspapers', () => {
    it('it should DELETE a newspapers given the id', done => {
      const id = createdID.slice(-1).pop()

      chai
        .request(server)
        .delete(`/api/newspapers/${id}`)
        .set('Authorization', `Bearer`)
        .end((error, result) => {
          result.should.have.status(200)
          result.body.should.be.a('object')
          done()
        })
    })
  })
})
