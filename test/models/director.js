var should = require('should');

var Director = require('../../app/models/director');

it('retrieves director data', function (done) {
  var cameron = new Director('6488824');

  cameron.fetchRemoteFields(function (err, statusCode) {
    (cameron.fields.full_name).should.be.exactly('James Cameron')
    statusCode.should.be.exactly(200);
    done();
  });
});

it('sets nothing when director is not found', function (done) {
  var nowhereMan = new Director('foo');

  nowhereMan.fetchRemoteFields(function (err, statusCode) {
    nowhereMan.should.not.have.property('full_name');
    nowhereMan.should.not.have.property('dob');
    statusCode.should.be.exactly(404);
    done();
  });
});
