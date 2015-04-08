var request  = require('request');
var dbClient = require('../../db');
var md5      = require('MD5');
var _        = require('underscore');
var async    = require('async');

var API_URL = 'https://api.new.livestream.com/accounts/';
var REDIS_KEY = 'directors:';
var DIRECTORS_INDEX_KEY = 'directors:index';

var Director = function (id, fields) {
  this.fields = fields;
  this.fields.livestream_id = id;
};

// fetches registered directors as plain JS objects
//
// callback takes in err and directors. err is a redis database error,
// directors is the an array of the directors
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

Director.prototype._redisKey = function () {
  return REDIS_KEY + this.fields.livestream_id;
};

// fetches a registered director
//
// callback takes in err and a director. err is a redis database error
// object, director is the director from the redis database
Director.findLocalById = function (livestream_id, callback) {
  dbClient.get(REDIS_KEY + livestream_id, function (err, reply) {
    var director = null;
    
    _.isString(reply) &&
      (director = new Director(livestream_id, JSON.parse(reply)));
    callback(null, director);
  });
};

// fetches a director from the livestream API
//
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
      
      director = new Director(livestream_id, fields);
    }

    callback(err, res && res.statusCode, director);
  }.bind(this));
};

// saves the director to the local database
//
// callback takes in redis database error
Director.prototype.save = function (callback) {
  this._ensureDefaults();
  
  dbClient.multi()
    .set(this._redisKey(), JSON.stringify(this.fields))
    .sadd(DIRECTORS_INDEX_KEY, this._redisKey())
    .exec(function (err) { callback(err) });
};

// sets the favorite_camera field. Does nothing if passed undefined
//
// returns true if passed undefined or a string
Director.prototype.setFavoriteCamera = function (favoriteCamera) {
  if (typeof favoriteCamera !== "undefined" && !_.isString(favoriteCamera))
    return false;

  favoriteCamera && (this.fields.favorite_camera = favoriteCamera);
  return true;
};

Director.prototype._validFavoriteMovies = function (favoriteMovies) {
  return _.isArray(favoriteMovies) && _.all(favoriteMovies, _.isString);
};

// sets the favorite_movies fields
//
// returns true if passed undefined or an array of strings, false
// otherwise
Director.prototype.setFavoriteMovies = function (favoriteMovies) {
  if (typeof favoriteMovies === "undefined") return true;
  
  if (!this._validFavoriteMovies(favoriteMovies)) return false;
     
  favoriteMovies && (this.fields.favorite_movies = _.uniq(favoriteMovies));
  return true;
};


// adds to the favorite_movies fields
//
// returns true if passed undefined or an array of strings, false
// otherwise
Director.prototype.addFavoriteMovies = function (favoriteMovies) {
  if (typeof favoriteMovies === "undefined") return true;
  
  if (!this._validFavoriteMovies(favoriteMovies)) return false;

  [].push.apply(this.fields.favorite_movies, favoriteMovies);
  this.fields.favorite_movies = _.uniq(this.fields.favorite_movies);
  return true;
};

// removes from the favorite_movies fields
//
// returns true if passed undefined or an array of strings, false
// otherwise
Director.prototype.removeFavoriteMovies = function (favoriteMovies) {
  if (typeof favoriteMovies === "undefined") return true;
  
  if (!this._validFavoriteMovies(favoriteMovies)) return false;

  this.fields.favorite_movies = _.difference(
    this.fields.favorite_movies,
    favoriteMovies
  );

  return true;
};

Director.prototype._ensureDefaults = function () {
  this.fields.favorite_movies = this.fields.favorite_movies || [];
};

Director.prototype.isAuthorized = function (key) {
  return md5(this.fields.full_name) === key;
};

module.exports = Director;

