var should   = require('should');
var api      = require('./helpers/livestream_api');
var dbClient = require('../db');
var request  = require('supertest');
var app      = require('../app');
var md5      = require('MD5');

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
    var cameron = {livestream_id: api.jamesCameron.livestream_id},
	livestream = api.jamesCameron.api();

    request(app)
      .post('/directors')
      .send(cameron)
      .expect(200)
      .end(function (err, res) {
  	if (err) return done(err);
	res.body.should.have.property('full_name', 'James Cameron');
  	done();
      });
  });

  it('responds with a 404 for an invalid account', function (done) {
    var nowhereMan = {livestream_id: api.nowhereMan.livestream_id},
	livestream = api.nowhereMan.api();
    
    request(app)
      .post('/directors')
      .send(nowhereMan)
      .expect(404, done);
  });

  it('responds with a 500 when there is a problem with the livestream api',
     function (done) {
       var nowhereMan = {livestream_id: api.livestreamDown.livestream_id},
	livestream = api.livestreamDown.api();
    
       request(app)
	 .post('/directors')
	 .send(nowhereMan)
	 .expect(500, done);
     }
    );

  it('responds with a 400 if the account is already created', function (done) {
    var cameron = {livestream_id: api.jamesCameron.livestream_id},
	livestream = api.jamesCameron.api();

    request(app)
      .post('/directors')
      .send(cameron)
      .end(function () {
	livestream = api.jamesCameron.api();
	request(app)
	  .post('/directors')
	  .send(cameron)
	  .expect(400, done);
      });
  });
});

describe('POST /directors/:id', function (done) {
  it('allows authorized users to edit director info', function (done) {
    var toUpdate = {
      favorite_camera: 'Nikon',
      favorite_movies: ['Fight Club']
    };
    
    request(app)
      .post('/directors/777')
      .set('Authorization', md5('Matt'))
      .send(toUpdate)
      .expect(200)
      .end(function (err, res) {
  	if (err) return done(err);
	
	res.body.should.have.property('favorite_camera', 'Nikon');
	res.body.favorite_movies.should.eql(['Fight Club']);
	
	dbClient.get('directors:777', function (err, resp) {
	  resp.should.match(/Nikon/);
	  resp.should.match(/Fight Club/);
	  resp.should.not.match(/Casablanca/);
  	  done();
	});
      });
  });

  it('adds to favorite_movies when requested to', function (done) {
    var toUpdate = {
      favorite_movies: ['Fight Club'],
      _action: 'add'
    };

    request(app)
      .post('/directors/777')
      .set('Authorization', md5('Matt'))
      .send(toUpdate)
      .expect(200)
      .end(function (err, res) {
  	if (err) return done(err);
	
	res.body.favorite_movies.should.containDeep([
	  'Casablanca',
	  'Fight Club'
	]);
	
	dbClient.get('directors:777', function (err, resp) {
	  resp.should.match(/Panasonic/);
	  resp.should.match(/Fight Club/);
	  resp.should.match(/Casablanca/);
  	  done();
	});
      });
  });

  it('removes from favorite_movies when requested to', function (done) {
    var toUpdate = {
      favorite_movies: ['Casablanca'],
      _action: 'remove'
    };

    request(app)
      .post('/directors/777')
      .set('Authorization', md5('Matt'))
      .send(toUpdate)
      .expect(200)
      .end(function (err, res) {
  	if (err) return done(err);
	
	res.body.favorite_movies.should.have.lengthOf(0);
	
	dbClient.get('directors:777', function (err, resp) {
	  resp.should.match(/Panasonic/);
	  resp.should.not.match(/Casablanca/);
  	  done();
	});
      });
  });
  
  it('responds with a 400 if the format is incorrect', function (done) {
    var toUpdate = {favorite_camera: {camera: 'Nikon'}};
    
    request(app)
      .post('/directors/777')
      .set('Authorization', md5('Matt'))
      .send(toUpdate)
      .expect(400, done);
  });

  it('responds with a 404 if the director is not found', function (done) {
    var toUpdate = {favorite_camera: 'Nikon'};

    request(app)
      .post('/directors/776')
      .send(toUpdate)
      .expect(404, done);
  });
  
  it('responds with a 401 if unauthorized', function (done) {
    var toUpdate = {favorite_camera: 'Nikon'};
    
    request(app)
      .post('/directors/777')
      .set('Authorization', md5('Idontknow'))
      .send(toUpdate)
      .expect(401, done);
  });
});

describe('GET /directors', function (done) {
  it('responds with all directors', function (done) {
    request(app)
      .get('/directors')
      .expect(200)
      .end(function (err, res) {
	if (err) return done(err);
	res.body.should.have.lengthOf(2);
	done();
      });
  });
});

describe('GET /directors/:id', function (done) {
  it('gets a directors info', function (done) {
    request(app)
      .get('/directors/777')
      .expect(200)
      .end(function (err, res) {
	if (err) return done(err);
	res.body.should.have.property('full_name', 'Matt');
	done();
      });
  });
  
  it('responds with a 404 if no director has that id', function (done) {
    request(app)
      .get('/directors/776')
      .expect(404, done);
  });
});
