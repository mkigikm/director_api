var dbClient = require('redis').createClient();
module.exports = dbClient;

var app = require('./app');
if (app.get('env') === 'development') dbClient.select(1);
if (app.get('env') === 'test') dbClient.select(2);  
