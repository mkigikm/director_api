var app      = require('./app');
var dbClient = require('redis').createClient();

if (app.get('env') === 'development') dbClient.select(1);
if (app.get('env') === 'test') dbClient.select(2);
  
module.exports = dbClient;
