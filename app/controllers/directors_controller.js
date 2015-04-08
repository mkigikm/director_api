var _        = require('underscore');
var async    = require('async');
var Director = require('../models/director');

var statusWithMessage = function (res, status, message) {
  res.status(status);
  res.json(message);
};

var CREATE_ERROR_MESSAGES = {
  404: "no livestream account with that id",
  500: "internal server error"
};

exports.create = function (req, res) {
  var id = req.body.livestream_id;
  
  if (!_.isString(id)) {
    statusWithMessage(res, 400, "must specify a livestream_id");
    return;
  }
  
  async.waterfall(
    [
      Director.findLocalById.bind(null, id),
      function (director, callback) {
	if (director) {
	  callback(true, true);
	} else {
	  callback(null);
	}
      },
      Director.findRemoteById.bind(null, id),
      function (statusCode, director, callback) {
	callback(null, false, statusCode, director);
      }
    ],
    _createResponse.bind(null, res)
  );
};

var _createResponse = function (res, err, local, statusCode, director) {
  if (_.isObject(err)) {
    statusWithMessage(res, 500, 'internal server error');
  } else if (local) {
    statusWithMessage(res, 400, 'that account has already been created');
  } else if (statusCode !== 200) {
    statusWithMessage(res, statusCode, CREATE_ERROR_MESSAGES[statusCode]);
  } else {
    _save(director, res);
  }
};

var setFields = function (director, fields) {
  fields.favorite_camera && director.setFavoriteCamera(fields.favorite_camera);
  
  if (fields.favorite_movies) {
    if (fields._action === "add") {
      return director.addFavoriteMovies(fields.favorite_movies);
    } else if (fields._action === "remove") {
      return director.removeFavoriteMovies(fields.favorite_movies);
    } else {
      director.setFavoriteMovies(fields.favorite_movies);
    }
  }

  return true;
};

var _save = function (director, res) {
  director.save(function (err) {
    if (err) {
      statusWithMessage(res, 500, "internal server error");
    } else {
      res.status(200);
      res.json(director.fields);
    }
  });
};

exports.update = function (req, res) {
  Director.findLocalById(req.params.id, function (err, director) {
    if (err) {
      statusWithMessage(res, 500, 'internal server error');
    } else if (!director) {
      statusWithMessage(res, 404, 'director not found');
    } else if (!director.isAuthorized(req.headers.authorization)) {
      statusWithMessage(res, 401, 'not authorized');
    } else {
      _updateResponse(res, req.body, director);
    }
  });
};

var UPDATE_METHODS = {
  'add': 'addFavoriteMovies',
  'remove': 'removeFavoriteMovies'
};

var _updateResponse = function (res, fields, director) {
  var method = UPDATE_METHODS[fields._action] || 'setFavoriteMovies';
  console.log(fields);

  if (!director.setFavoriteCamera(fields.favorite_camera)) {
    statusWithMessage(res, 400, 'favorite_camera must be a string');
  } else if (!director[method](fields.favorite_movies)) {
    statusWithMessage(res, 400, 'favorite_movies must be an array of strings');
  } else {
    _save(director, res);
  }
};

exports.index = function (req, res) {
  Director.allAsObjects(function (err, directors) {
    if (!err) {
      res.status(200);
      res.json(directors);
    } else {
      statusWithMessage(res, 500, "internal server error");
    }
  });
};

exports.show = function (req, res) {
  Director.findLocalById(req.params.id, function (err, director) {
    if (!err && director) {
      res.status(200);
      res.json(director.fields);
    } else if (err) {
      statusWithMessage(res, 500, "internal server error");
    } else {
      statusWithMessage(res, 404, "no director found");
    }
  });
};
