var should   = require('should');
var api      = require('../helpers/livestream_api');
var md5      = require('MD5');
var dbClient = require('../../db');

var Director = require('../../app/models/director');

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

describe('Director#findRemoteById', function (done) {
  it('retrieves remote director data', function (done) {
    var id            = api.jamesCameron.livestream_id,
	livestreamApi = api.jamesCameron.api();
    
    Director.findRemoteById(id, function (err, statusCode, cameron) {
      cameron.fields.should.have.property('full_name', 'James Cameron')
      statusCode.should.be.exactly(200);
      done();
    });
  });

  it('sets nothing when director is not found', function (done) {
    var id            = api.nowhereMan.livestream_id,
	livestreamApi = api.nowhereMan.api();

    Director.findRemoteById(id, function (err, statusCode, nowhereMan) {
      should.not.exist(nowhereMan);
      statusCode.should.be.exactly(404);
      done();
    });
  });

  it('sets nothing when there is server error', function (done) {
    var id            = api.livestreamDown.livestream_id,
	livestreamApi = api.livestreamDown.api();

    Director.findRemoteById(id, function (err, statusCode, nowhereMan) {
      should.not.exist(nowhereMan);
      statusCode.should.be.exactly(500);
      done();
    });
  });
});

describe('Director#findLocalById', function (done) {
  it('retrieves local director data', function (done) {
    Director.findLocalById('777', function (err, matt) {
      matt.fields.should.have.property('full_name', 'Matt');
      done();
    });
  });

  it('sets nothing when the director is not local', function (done) {
    Director.findLocalById('foo', function (err, nowhereMan) {
      should.not.exist(nowhereMan);
      done();
    });
  });
});

describe('Director#setFavoriteCamera', function () {
  it('updates fields.favorite_camera if passed a value');
  it('does not set the fields.favorite_camera key if passed undefined');
});

describe('Director#save', function (done) {
  it('updates the local fields', function (done) {
    var matt = new Director('777');
    var fields = {
      favorite_camera: 'Sony F65',
      favorite_movies: ['Fight Club', 'The Matrix']
    };

    matt.save(fields, function (err, valid) {
      valid.should.be.true;
      matt.fetchLocalFields(function (err, local) {
	matt.fields.should.have.property('favorite_camera', 'Sony F65');
	matt.fields.favorite_movies.should.containDeep(
	  ['Fight Club', 'The Matrix']
	);
	done();
      });
    });
  });
  
  it('does not modify immutable fields', function (done) {
    var matt = new Director('777');
    var fields = { full_name: 'Matthew' };

    matt.save(fields, function (err, valid) {
      valid.should.be.true;
      matt.fetchLocalFields(function (err, local) {
	matt.fields.should.have.property('full_name', 'Matt');
	done();
      });
    });
  });
  
  it('validates favorite_camera', function (done) {
    var matt = new Director('777');
    var fields = { favorite_camera: {camera: 'Nikon'} };

    matt.save(fields, function (err, valid) {
      valid.should.be.false;

      matt = new Director('777');
      matt.fetchLocalFields(function (err, local) {
	matt.fields.should.have.property('favorite_camera', 'Panasonic');
	done();
      });
    });
  });
  
  it('validates favorite_movies', function (done) {
    var matt = new Director('777');
    var fields = { favorite_movies: ['Fight Club', null] };

    matt.save(fields, function (err, valid) {
      valid.should.be.false;
      
      matt = new Director('777');
      matt.fetchLocalFields(function (err, local) {
	matt.fields.favorite_movies.should.containDeep(['Casablanca']);
	matt.fields.favorite_movies.should.have.lengthOf(1);
	done();
      });
    });
  });

  it('only saves unique favorite_movies', function (done) {
    var matt = new Director('777');
    var fields = {
      favorite_movies: [
	'Gone with the Wind',
	'Gone with the Wind',
	'Casablanca'
      ]
    };

    matt.save(fields, function (err, valid) {
      matt.fetchLocalFields(function (err, local) {
	matt.fields.favorite_movies.should.containDeep(
	  ['Gone with the Wind', 'Casablanca']
	);
	matt.fields.favorite_movies.should.have.lengthOf(2);
	done();
      });
    });
  });
});

describe('Director#allAsObjects', function (done) {
  it('retrieves all the records as plain objects', function (done) {
    Director.allAsObjects(function (err, results) {
      results.should.have.lengthOf(2);
      done();
    });
  });

  it('retrieves newly saved directors', function (done) {
    var vin = new Director('101010');

    vin.save({}, function (err, valid) {
      Director.allAsObjects(function (err, results) {
	results.should.have.lengthOf(3);
	done();
      });
    });
  });
});

describe('Director#isAuthorized', function () {
  it('only returns true if passed md5(full_name)', function () {
    var matt = new Director('abcdef');
    matt.fields.full_name = 'Matt';
    matt.isAuthorized(md5('Matt')).should.be.true;
    matt.isAuthorized(md5('Matf')).should.be.false;
    matt.isAuthorized('Matt').should.be.false;
    matt.isAuthorized('').should.be.false;
  });
});
