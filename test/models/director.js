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

describe('Director#findLocalById', function () {
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

describe('updating a director', function () {
  var matt;
  
  beforeEach(function () {
    matt = new Director({favorite_movies: ['Casablanca']});
  });
  
  describe('Director#setFavoriteCamera', function () {
    it('updates fields.favorite_camera if passed a value', function () {
      matt.setFavoriteCamera('Nikon').should.be.true;
      matt.fields.should.have.property('favorite_camera', 'Nikon');
    });
    
    it('does not set the fields.favorite_camera key if passed undefined',
       function () {
	 matt.setFavoriteCamera().should.be.true;
	 matt.fields.should.not.have.property('favorite_camera');
       });
    
    it('validates that favorite_camera is a string', function () {
      matt.setFavoriteCamera({camera: 'Nikon'}).should.be.false;
      matt.fields.should.not.have.property('favorite_camera');
    });
  });

  describe('Director#setFavoriteMovies', function () {
    it('updates fields.favorite_movies if passed a value', function () {
      matt.setFavoriteMovies(['Fight Club', 'The Matrix']).should.be.true;
      matt.fields.favorite_movies.should.containDeep(
	['Fight Club', 'The Matrix']
      );
    });
    
    it('does not set fields.favorite_movies if passed undefined', function () {
      matt.setFavoriteMovies().should.be.true;
      matt.fields.favorite_movies.should.have.lengthOf(1);
    });
    
    it('validates that favorite_movies is an array of strings', function () {
      matt.setFavoriteMovies([{movie: 'Fight Club'}, 'The Matrix'])
	.should.be.false;
      matt.fields.favorite_movies.should.have.lengthOf(1);
    });
    
    it('only adds unique values to favorite_movies', function () {
      matt.setFavoriteMovies(['Fight Club', 'Fight Club']).should.be.true;
      matt.fields.favorite_movies.should.have.lengthOf(1);
    });
  });

  describe('Director#addFavoriteMovies', function () {
    it('adds new movies to favorite_movies', function () {
      matt.setFavoriteMovies(['Fight Club', 'Casablanca']).should.be.true;
      matt.fields.favorite_movies.should.have.lengthOf(2);
            matt.fields.favorite_movies.should.containDeep(
	['Fight Club', 'Casablanca']
      );
    });

    it('validates that favorite_movies is an array of strings', function () {
      matt.addFavoriteMovies([{movie: 'Fight Club'}]).should.be.false;
      matt.fields.favorite_movies.should.have.lengthOf(1);
    });
  });

  describe('Director#removeFavoriteMovies', function () {
    it('removes movies from favorite_movies', function () {
      matt.removeFavoriteMovies(['Casablanca']).should.be.true;
      matt.fields.favorite_movies.should.have.lengthOf(0);
    });

    it('validates that favorite_movies is an array of strings', function () {
      matt.removeFavoriteMovies([{movie: 'Casablanca'}]).should.be.false;
      matt.fields.favorite_movies.should.have.lengthOf(1);
    });
  });

  describe('Director#save', function () {
    it('updates the local fields', function (done) {
      Director.findLocalById('777', function (err, matt) {
	matt.setFavoriteCamera('Sony F65');
	matt.setFavoriteMovies(['Fight Club', 'The Matrix']);
	
	matt.save(function (err) {
	  Director.findLocalById(matt.fields.id, function (err, matt) {
	    matt.fields.should.have.property('favorite_camera', 'Sony F65');
	    matt.fields.favorite_movies.should.containDeep(
	      ['Fight Club', 'The Matrix']
	    );
	    done();
	  });
	});
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
    var vin = new Director({livestream_id: '101010'});

    vin.save(function (err, valid) {
      Director.allAsObjects(function (err, results) {
	results.should.have.lengthOf(3);
	done();
      });
    });
  });
});

describe('Director#isAuthorized', function () {
  it('only returns true if passed md5(full_name)', function () {
    var matt = new Director({livestream_id: 'abcdef'});
    matt.fields.full_name = 'Matt';
    matt.isAuthorized(md5('Matt')).should.be.true;
    matt.isAuthorized(md5('Matf')).should.be.false;
    matt.isAuthorized('Matt').should.be.false;
    matt.isAuthorized('').should.be.false;
  });
});
