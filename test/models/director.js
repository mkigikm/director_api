var should = require('should');

var Director = require('../../app/models/director');

it('retrieves director data', function (done) {
  var cameron = new Director('6488824');

  cameron.getLivestreamFields(function (err) {
    (cameron.fields.full_name).should.be.exactly('James Cameron')
    err.should.be.false;
    done();
  });
});

it('sets nothing when director is not found', function (done) {
  var nowhereMan = new Director('foo');

  nowhereMan.getLivestreamFields(function (ok) {
    nowhereMan.should.not.have.property('full_name');
    nowhereMan.should.not.have.property('dob');
    err.should.be.true;
    done();
  });
});
