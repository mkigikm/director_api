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

// callback takes in err and local. err is a redis database error
// object, local is true if the director is in the local database
Director.prototype.fetchLocalFields = function (callback) {
  dbClient.get(this.redisKey(), function (err, reply) {
    var local = typeof reply === 'string',
	key, fields;
    
    if (local) {
      fields = JSON.parse(reply);
      for (key in fields) this.fields[key] = fields[key];
    }
    
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

// callback takes in err and valid. err is a redis database error
// object, valid is true if the director was valid.
Director.prototype.save = function (fields, callback) {
  this.set(fields);
  
  if (this.valid()) {
    this.fetchLocalFields(function (err) {
      this.set(fields);
      err ? callback(err, true) : this.saveToDb(callback);
    }.bind(this));
  } else {
    callback(null, false);
  }
};

Director.prototype.saveToDb = function (callback) {
  dbClient.multi()
    .set(this.redisKey(), JSON.stringify(this.fields))
    .sadd(DIRECTORS_INDEX_KEY, this.redisKey())
    .exec(function (err) { callback(err, true) });
};

Director.prototype.set = function (fields) {
  var key;
  
  for (key in fields) {
    if (key === 'favorite_camera' || key === 'favorite_movies') {
      this.fields[key] = fields[key];
    }
  }
};

Director.prototype.ensureDefaults = function () {
  this.fields.favorite_movies = this.fields.favorite_movies || [];
};

Director.prototype.errors = function (message) {
  this._errors = this._errors || [];
  return this._errors;
};

Director.prototype.valid = function () {
  this.ensureDefaults();
  return this.validFavoriteCamera() && this.validFavoriteMovies();
};

Director.prototype.validFavoriteCamera = function () {
  var ok = typeof this.fields.favorite_camera === "undefined" ||
      typeof this.fields.favorite_camera === "string";

  if (!ok) this.errors().push("favorite_camera must be a string");

  return ok;
};

Director.prototype.validFavoriteMovies = function () {
  var ok = this.fields.favorite_movies instanceof Array;

  if (ok) {
    this.fields.favorite_movies.forEach(function (movie) {
      ok = ok && typeof movie === "string";
    });
  }

  if (!ok) this.errors().push("favorite_movies must be an array of strings");

  return ok;
};

module.exports = Director;

