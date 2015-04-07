var should   = require('should');
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

describe('Director#fetchRemoteFields', function (done) {
  it('retrieves remote director data', function (done) {
    var cameron = new Director('6488824');
    this.timeout(5000);

    cameron.fetchRemoteFields(function (err, statusCode) {
      cameron.fields.should.have.property('full_name', 'James Cameron')
      statusCode.should.be.exactly(200);
      done();
    });
  });

  it('sets nothing when director is not found', function (done) {
    var nowhereMan = new Director('foo');
    this.timeout(5000);

    nowhereMan.fetchRemoteFields(function (err, statusCode) {
      nowhereMan.should.not.have.property('full_name');
      nowhereMan.should.not.have.property('dob');
      statusCode.should.be.exactly(404);
      done();
    });
  });
});

describe('Director#fetchLocalFields', function (done) {
  it('retrieves local director data', function (done) {
    var matt = new Director('777');

    matt.fetchLocalFields(function (err, local) {
      matt.fields.should.have.property('full_name', 'Matt');
      local.should.be.true;
      done();
    });
  });

  it('sets nothing when the director is not local', function (done) {
    var nowhereMan = new Director('foo');

    nowhereMan.fetchLocalFields(function (err, local) {
      nowhereMan.should.not.have.property('full_name');
      nowhereMan.should.not.have.property('dob');
      local.should.be.false;
      done();
    });
  });
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
