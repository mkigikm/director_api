var request  = require('request');
var dbClient = require('redis').createClient();

var apiURL = 'https://api.new.livestream.com/accounts/';

var Director = function (livestreamId) {
  this.id = livestreamId;
  this.fields = {livestream_id: livestreamId};
};

Director.prototype.getLivestreamFields = function (callback) {
  request(this.url(), function (err, res, body) {
    err = err && res.statusCode !== 200;
    
    if (!err) {
      body = JSON.parse(body);
      this.fields.full_name = body.full_name;
      this.fields.dob       = body.dob;
    }

    callback && callback(err, res.statusCode);
  }.bind(this));
};

Director.prototype.getLocalFields = function (callback) {
  dbClient.get(this.redisKey, function (err, reply) {
    typeof reply === 'string' && this.fields = JSON.parse(reply);
    
    callback && callback(err);
  }.bind(this));
};

Director.prototype.isLocal = function (callback) {
  dbClient.get(this.redisKey, function (err, reply) {
    callback && callback(err, typeof reply === 'string');
  });
};

Director.prototype.url = function () {
  return apiURL + this.id;
};

Director.prototype.redisKey = function () {
  return 'directors:' + this.id;
};

module.exports = Director;
