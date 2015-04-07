var nock = require('nock');

nock.enableNetConnect();

var cameronId = '6488824';
exports.jamesCameron =  {
  livestream_id: cameronId,
  api: function () {
    return nock('https://api.new.livestream.com')
      .get('/accounts/' + cameronId)
      .reply(200, {
	"id": cameronId,
	"full_name": "James Cameron",
	"dob": "1954-08-16T00:00:00.000Z"
      });
  }
};

var nowhereManId = 'foo';
exports.nowhereMan =  {
  livestream_id: nowhereManId,
  api: function () {
    return nock('https://api.new.livestream.com')
      .get('/accounts/' + nowhereManId)
      .reply(404, {
	"name": "NotFoundError",
	"message": "Account not found"
      });
  }
};

exports.livestreamDown = {
  livestream_id: nowhereManId,
  api: function () {
    return nock('https://api.new.livestream.com')
      .get('/accounts/' + nowhereManId)
      .reply(500, {});
  }
};
