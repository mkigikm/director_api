var dbClient = require('redis').createClient();

// You have to refer to different redis databases by integer. Using
// the default (0) for production
if (app.get('env') === 'development') dbClient.select(1);
if (app.get('env') === 'test') dbClient.select(2);

modules.exports = dbClient;
