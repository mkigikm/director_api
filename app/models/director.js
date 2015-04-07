var request  = require('request');
var dbClient = require('../../db');
var md5      = require('MD5');
var _        = require('underscore');
var async    = require('async');

var API_URL = 'https://api.new.livestream.com/accounts/';
var REDIS_KEY = 'directors:';
var DIRECTORS_INDEX_KEY = 'directors:index';

var Director = function (fields) {
  this.fields = fields;
};

// callback takes in err and results. err is a redis database error,
// results is the directors as plain JS objects
Director.allAsObjects = function (callback) {
  dbClient.sort(
    DIRECTORS_INDEX_KEY, 'by', 'nosort', 'get', '*',
    function (err, results) {
      if (!err) {
	callback(err, results.map(function (director) {
	  return JSON.parse(director);
	}));
      } else {
	callback(err, null);
      }
    }
  );
};

Director.prototype.redisKey = function () {
  return REDIS_KEY + this.fields.livestream_id;
};

// callback takes in err and a director. err is a redis database error
// object, director is the director from the redis database
Director.findLocalById = function (livestream_id, callback) {
  dbClient.get(REDIS_KEY + livestream_id, function (err, reply) {
    var director = null;
    
    _.isString(reply) && (director = new Director(JSON.parse(reply)));
    callback(null, director);
  });
};

// callback takes in err, statusCode, and the director. err is the
// reply error object and statusCode is the status code of the HTTP
// request
Director.findRemoteById = function (livestream_id, callback) {
  request(API_URL + livestream_id, function (err, res, body) {
    var director = null,
	fields = {};
    
    if (!err && res.statusCode === 200) {
      body = JSON.parse(body);
      fields.full_name = body.full_name;
      fields.dob       = body.dob;
      
      director = new Director(fields);
    }

    callback(err, res && res.statusCode, director);
  }.bind(this));
};

// callback takes in err and valid. err is a redis database error
// object, valid is true if the director was valid.
Director.prototype.save = function (callback) {
  this.ensureDefaults();
  
  dbClient.multi()
    .set(this.redisKey(), JSON.stringify(this.fields))
    .sadd(DIRECTORS_INDEX_KEY, this.redisKey())
    .exec(function (err) { callback(err, true) });
};

Director.prototype.setFavoriteCamera = function (favoriteCamera) {
  if (typeof favoriteCamera !== "undefined" && !_.isString(favoriteCamera))
    return false;

  favoriteCamera && (this.fields.favorite_camera = favoriteCamera);
  return true;
};

Director.prototype._validFavoriteMovies = function (favoriteMovies) {
  return _.isArray(favoriteMovies) && _.all(favoriteMovies, _.isString);
};

Director.prototype.setFavoriteMovies = function (favoriteMovies) {
  if (typeof favoriteMovies === "undefined") return true;
  
  if (!this._validFavoriteMovies(favoriteMovies)) return false;
     
  favoriteMovies && (this.fields.favorite_movies = _.uniq(favoriteMovies));
  return true;
};

Director.prototype.addFavoriteMovies = function (favoriteMovies) {
  if (typeof favoriteMovies === "undefined") return true;
  
  if (!this._validFavoriteMovies(favoriteMovies)) return false;

  [].push.apply(this.fields.favorite_movies, favoriteMovies);
  this.fields.favorite_movies = _.uniq(favoriteMovies);
  return true;
};

Director.prototype.removeFavoriteMovies = function (favoriteMovies) {
  if (typeof favoriteMovies === "undefined") return true;
  
  if (!this._validFavoriteMovies(favoriteMovies)) return false;

  this.fields.favorite_movies = _.difference(
    this.fields.favorite_movies,
    favoriteMovies
  );

  return true;
};

Director.prototype.ensureDefaults = function () {
  this.fields.favorite_movies = this.fields.favorite_movies || [];
};

Director.prototype.isAuthorized = function (key) {
  return md5(this.fields.full_name) === key;
};

module.exports = Director;

