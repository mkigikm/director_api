var request  = require('request');
var dbClient = require('../../db.js');

var API_URL = 'https://api.new.livestream.com/accounts/';
var DIRECTORS_INDEX_KEY = 'directors:index';

var Director = function (livestreamId) {
  this.fields = {livestream_id: livestreamId};
};

// callback takes in err. err is true if there is a database error
Director.allAsJSON = function (callback) {
  dbClient.sort(DIRECTORS_INDEX_KEY, 'by', 'nosort', 'get', '#', callback);
};

Director.prototype.redisKey = function () {
  return 'directors:' + this.fields.livestream_id;
};

// callback takes in err and local. err is true if there is a database
// error, local is true if the director is in the local database
Director.prototype.fetchLocalFields = function (callback) {
  dbClient.get(this.redisKey(), function (err, reply) {
    var local = typeof reply === 'string';
    local && (this.fields = JSON.parse(reply));
    
    callback && callback(err, local);
  }.bind(this));
};

Director.prototype.livestreamUrl = function () {
  return API_URL + this.fields.livestream_id;
};

// callback takes in err and statusCode. err is the reply error object
// and statusCode is the status code of the HTTP request
Director.prototype.fetchRemoteFields = function (callback) {
  request(this.livestreamUrl(), function (err, res, body) {
    if (!err && res.statusCode === 200) {
      body = JSON.parse(body);
      this.fields.full_name = body.full_name;
      this.fields.dob       = body.dob;
    }

    callback && callback(err, res && res.statusCode);
  }.bind(this));
};

// callback takes in err and valid. err is true if there is a database
// error, valid is true if the director was valid.
Director.prototype.save = function (fields, callback) {
  if (this.valid()) {
    dbClient.multi()
      .set(this.redisKey(), JSON.stringify(this.fields))
      .sadd(DIRECTORS_INDEX_KEY, this.redisKey())
      .exec(function (err) { callback(err, true) });
  } else {
    callback(false, false);
  }
};

Director.prototype.ensureDefaults = function () {
  this.fields.favorite_movies = this.fields.favorite_movies || [];
};

Director.prototype.set = function (fields) {
  var key;
  for (key in fields) this.fields[key] = fields[key];
};

Director.prototype.ensureDefaults = function () {
  this.fields.camera = this.fields.camera || "";
  this.fields.favorite_movies = this.fields.favorite_movies || [];
};

Director.prototype.errors = function (message) {
  this.errors = this.errors || [];
};

Director.prototype.valid = function () {
  this.ensureDefaults();
  return this.validCamera() && this.validFavoriteMovies();
};

Director.prototype.validCamera = function () {
  var ok = typeof this.fields.camera === "undefined" ||
      typeof this.fields.camera === "string";

  if (!ok) this.errors().push("camera must be a string");

  return ok;
};

Director.prototype.validMovies = function () {
  var ok = this.fields.favorite_movies instanceof Array;

  if (ok) {
    this.fields.favorite_movies.forEach(function (movie) {
      ok = ok && typeof movie === "string";
    });
  }

  if (!ok) this.errors.push("favorite_movies must be an array of strings");

  return ok;
};

module.exports = Director;
