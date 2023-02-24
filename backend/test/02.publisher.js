const faker = require('faker')
const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../server')
// eslint-disable-next-line no-unused-vars
const should = chai.should()

chai.use(chaiHttp)
describe('*********** Publisher ***********', () => {
  describe('/GET publishers', () => {
    it('it should GET the publisher', done => {
      chai
        .request(server)
        .get('/api/publishers')
        .set('Authorization', `Bearer`)
        .end((err, res) => {
          res.should.have.status(200)
          res.body.should.be.an('array')
          done()
        })
    })
  })
})
