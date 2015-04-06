var _        = require('underscore');
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
  console.log(req.body);
  if (!_.isString(req.body.livestream_id)) {
    statusWithMessage(res, 400, "must specify a livestream_id");
    return;
  }
  
  var director = new Director(req.body.livestream_id);
  director.fetchLocalFields(function (err, local) {
    if (err) {
      statusWithMessage(res, 500, "internal server error");
    } else if (local) {
      statusWithMessage(res, 400, "that account has already been created");
    } else {
      director.fetchRemoteFields(function (err, statusCode) {
	if (!err && statusCode === 200) {
	  save(director, {}, res);
	} else {
	  statusWithMessage(res, statusCode, CREATE_ERROR_MESSAGES[statusCode]);
	}
      });
    }
  });
};

var save = function (director, fields, res) {
  director.save(fields, function (err, valid) {
    if (err) {
      statusWithMessage(res, 500, "internal server error");
    } else if (!valid) {
      statusWithMessage(res, 400, directors.errors());
    } else {
      res.status(200);
      res.json(director.fields);
    }
  });
};
