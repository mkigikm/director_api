# Livestream Director API

## Description
An API for allowing movie directors with
[livestream](http://new.livestream.com) accounts to list there
favorite movies and cameras. Directors can
* create accounts from existing livestream accounts
* update their favorite movies
* update their favorite cameras
Everyone can get a list of directors that have created accounts.

## API Details
Requests and responses to the API are made with
JSON. For a request to update a directors attributes, there must be an
MD5 sum of the director's livestream id in a header. This at least
stops casual unauthorized access.

The API endpoints are:
* GET /directors, a listing of all directors
* POST /directors, create a new director
* GET /directors/:id, list a director
* POST /directors/:id, update a director

## Implementation Details
The express package is used to serve up the API.
