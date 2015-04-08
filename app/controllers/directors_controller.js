var _        = require('underscore');
var async    = require('async');
var Director = require('../models/director');

var _statusWithMessage = function (res, status, message) {
  res.status(status);
  res.json(message);
};

// action for POST /directors
exports.create = function (req, res) {
  var id = req.body.livestream_id;
  
  if (!_.isString(id)) {
    _statusWithMessage(res, 400, "must specify a livestream_id");
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

var CREATE_ERROR_MESSAGES = {
  404: "no livestream account with that id",
  500: "internal server error"
};

var _createResponse = function (res, err, local, statusCode, director) {
  if (_.isObject(err)) {
    _statusWithMessage(res, 500, 'internal server error');
  } else if (local) {
    _statusWithMessage(res, 400, 'that account has already been created');
  } else if (statusCode !== 200) {
    _statusWithMessage(res, statusCode, CREATE_ERROR_MESSAGES[statusCode]);
  } else {
    _save(director, res);
  }
};

var _save = function (director, res) {
  director.save(function (err) {
    if (err) {
      _statusWithMessage(res, 500, "internal server error");
    } else {
      res.status(200);
      res.json(director.fields);
    }
  });
};

// action for POST /directors/:livestream_id
exports.update = function (req, res) {
  Director.findLocalById(req.params.id, function (err, director) {
    if (err) {
      _statusWithMessage(res, 500, 'internal server error');
    } else if (!director) {
      _statusWithMessage(res, 404, 'director not found');
    } else if (!director.isAuthorized(req.headers.authorization)) {
      _statusWithMessage(res, 401, 'not authorized');
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

  if (!director.setFavoriteCamera(fields.favorite_camera)) {
    _statusWithMessage(res, 400, 'favorite_camera must be a string');
  } else if (!director[method](fields.favorite_movies)) {
    _statusWithMessage(res, 400, 'favorite_movies must be an array of strings');
  } else {
    _save(director, res);
  }
};

// action for GET /directors
exports.index = function (req, res) {
  Director.allAsObjects(function (err, directors) {
    if (!err) {
      res.status(200);
      res.json(directors);
    } else {
      _statusWithMessage(res, 500, "internal server error");
    }
  });
};

// action for GET /directors/:livestream_id
exports.show = function (req, res) {
  Director.findLocalById(req.params.id, function (err, director) {
    if (!err && director) {
      res.status(200);
      res.json(director.fields);
    } else if (err) {
      _statusWithMessage(res, 500, "internal server error");
    } else {
      _statusWithMessage(res, 404, "no director found");
    }
  });
};
