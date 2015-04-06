var should   = require('should');
var dbClient = require('../db');
var request  = require('supertest');
var app      = require('../app');

beforeEach(function () {
  dbClient.flushdb();
  dbClient.set(
    'directors:777',
    JSON.stringify({
      full_name: 'Matt',
      favorite_camera: 'Panasonic',
      favorite_movies: ['Casablanca']
    })
  );
  dbClient.set(
    'directors:999',
    JSON.stringify({
      full_name: 'Lydia'
    })
  );
  dbClient.sadd('directors:index', 'directors:777', 'directors:999');
});

after(function () {
  dbClient.flushdb();
});

describe('POST /directors', function (done) {
  it('allows for account registration', function (done) {
    var cameron = {livestream_id: '6488824'};
    this.timeout(10000);

    request(app)
      .post('/directors')
      .send(cameron)
      .expect(200)
      .end(function (err, res) {
  	if (err) done(err);
	res.body.should.have.property('full_name', 'James Cameron');
  	done();
      });
  });

  it('responds with a 404 for an invalid account', function (done) {
    var nowhereMan = {livestream_id: 'foo'};
    this.timeout(10000);
    
    request(app)
      .post('/directors')
      .send(nowhereMan)
      .expect(404, done);
  });

  it('responds with a 400 if the account is already created', function (done) {
    var cameron = {livestream_id: '6488824'};
    this.timeout(20000);

    request(app)
      .post('/directors')
      .send(cameron)
      .end(function () {
	request(app)
	  .post('/directors')
	  .send(cameron)
	  .expect(400, done);
      });
  });
});

describe('POST /directors/:id', function (done) {
  it('allows authorized users to edit director info');
  it('responds with a 400 if the format is incorrect');
  it('responds with a 401 if unauthorized');
});

describe('GET /directors');
describe('GET /directors/:id');
