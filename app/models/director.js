var request = require('request');

var apiURL = 'https://api.new.livestream.com/accounts/';

var Director = function (livestreamId) {
  this.id = livestreamId;
  this.fields = {livestream_id: livestreamId};
}

Director.prototype.getLivestreamFields = function (callback) {
  request(this.url(), function (err, res, body) {
    var ok = !err && res.statusCode === 200;
    
    if (ok) {
      body = JSON.parse(body);
      this.fields.full_name = body.full_name;
      this.fields.dob       = body.dob;
    }

    callback && callback(ok);
  }.bind(this));
};

Director.prototype.url = function () {
  return apiURL + this.id;
};

module.exports = Director;
