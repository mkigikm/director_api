var should = require('should');

var Director = require('../../app/models/director');
var dbClient = require('../../db');

before(function () {
  dbClient.flushdb();
  dbClient.set(
    'directors:777',
    JSON.stringify({
      full_name: 'Matt'
    })
  );
  dbClient.set(
    'directors:999',
    JSON.stringify({
      full_name: 'Lydia'
    })
  );
});

after(function () {
  dbClient.flushdb();
});

// describe('Director#fetchRemoteFields', function (done) {
//   it('retrieves remote director data', function (done) {
//     var cameron = new Director('6488824');

//     cameron.fetchRemoteFields(function (err, statusCode) {
//       (cameron.fields.full_name).should.be.exactly('James Cameron')
//       statusCode.should.be.exactly(200);
//       done();
//     });
//   });

//   it('sets nothing when director is not found', function (done) {
//     var nowhereMan = new Director('foo');

//     nowhereMan.fetchRemoteFields(function (err, statusCode) {
//       nowhereMan.should.not.have.property('full_name');
//       nowhereMan.should.not.have.property('dob');
//       statusCode.should.be.exactly(404);
//       done();
//     });
//   });
// });

describe('Director#fetchLocalFields', function (done) {
  it('retrieves local director data', function (done) {
    var matt = new Director('777');

    matt.fetchLocalFields(function (err, local) {
      (matt.fields.full_name).should.be.exactly('Matt');
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
	(matt.fields.favorite_camera).should.be.exactly('Sony F65');
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
	(matt.fields.full_name).should.be.exactly('Matt');
	done();
      });
    });
  });
  
  it('validates data types');
});

describe('Director#allAsJSON', function (done) {
  it('retrieves all the records as plain objects');
});
