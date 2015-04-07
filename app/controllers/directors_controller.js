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
      Director.findLocalById.bind(director),
      function (director, callback) {
	if (director) {
	  callback(true, true, null);
	} else {
	  callback(null);
	}
      },
      Director.findRemoteById.bind(id),
      function (statusCode, director, callback) {
	callback(null, false, statusCode, director);
      }
    ],
    createResponse.bind(null, res)
  );
};

var createResponse = function (res, err, local, statusCode, director) {
  if (_.isObject(err)) {
    statusWithMessage(res, 500, 'internal server error');
  } else if (local) {
    statusWithMessage(res, 400, 'that account has already been created');
  } else if (statusCode !== 200) {
    statusWithMessage(res, statusCode, CREATE_ERROR_MESSAGES[statusCode]);
  } else {
    save(director, res);
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

var save = function (director, res) {
  director.save(function (err, valid) {
    if (err) {
      statusWithMessage(res, 500, "internal server error");
    } else if (!valid) {
      statusWithMessage(res, 400, director.errors());
    } else {
      res.status(200);
      res.json(director.fields);
    }
  });
};

exports.update = function (req, res) {
  var director = new Director(req.params.id);

  async.waterfall(
    [
      director.fetchLocalFields.bind(director),
      function (local, callback) {
	var authorized = director.isAuthorized(req.headers.authorization),
	    err = !local || !authorized;
	callback(err, local, authorized);
      }
    ],
    updateResponse.bind(null, res, director, req.body)
  );
};

var updateResponse = function (res, director, fields, err, local, authorized) {
  if (_.isObject(err)) {
    statusWithMessage(res, 500, 'internal server error');
  } else if (!local) {
    statusWithMessage(res, 404, 'director not found');
  } else if (!authorized) {
    statusWithMessage(res, 401, 'not authorized');
  } else {
    save(director, fields, res);
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
  var director = new Director(req.params.id);

  director.fetchLocalFields(function (err, local) {
    if (!err && local) {
      res.status(200);
      res.json(director.fields);
    } else if (err) {
      statusWithMessage(res, 500, "internal server error");
    } else {
      statusWithMessage(res, 404, "no director found");
    }
  });
};
