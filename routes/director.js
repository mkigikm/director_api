var express = require('express');
var router  = express.Router();

var directorsController = require('../app/controllers/directors');

router.get ('/',    directorsController.index);
router.post('/',    directorsController.create);
router.get ('/:id', directorsController.show);
router.post('/:id', directorsController.update);

module.exports = router;
