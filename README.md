# Livestream Director API

## Description

An API for allowing movie directors with
[livestream](http://new.livestream.com) accounts to list their
favorite movies and cameras. Directors can
* create accounts from existing livestream accounts
* update their favorite movies
* update their favorite cameras

Everyone can get a list of directors that have created accounts.

Redis is used for the local database, and to run it will require a
local Redis server with no access control. It uses three database, 0
for production, 1 for development, and 2 for testing. Anytime the
tests are run, database 2 is flushed, so be careful about running the
tests on a server that has a Redis database being used for something
else.

To get started run

	$ npm install

To run the tests use the command

	$ npm test

and to run the server use the command

	$ npm start

## API Details

The body of all HTTP requests for this API is in JSON, so every POST
request should have the header `Content-Type: application/json`,
otherwise the request will not be processed (400 error).

### GET /directors

Returns a listing of all directors:

    [
	  {
	    "livestream_id": "6488818",
		"full_name": "Steven Speilberg",
		"dob": "2012‐06‐26T06:07:15.000Z",
		"favorite_camera": "SonyF65",
		"favorite_movies": ["Lawrence of Arabia", "Fantasia", ...]
	  },
	  ...
	]

### POST /directors

Creates a new director. The body of the post must be a JSON object
with a valid livestream id:

    {
	  "livestream_id": "6488818"
	}

Responds with the created director object:

    {
	  "livestream_id": "6488818",
	  "full_name": "Steven Speilberg",
	  "dob": "2012‐06‐26T06:07:15.000Z",
	  "favorite_movies": []
	}

The director with the livestream id must not have already been created
on the system, otherwise the response will be a 400 error.

### POST /directors/:livestream_id

Updates a director. Only the `favorite_camera` and `favorite_movies`
attributes can be updated. `livestream_id`, `full_name`, and `dob` are
immutable, and come from the livestream account. The body of the post
must be a JSON object with the values to update:

    {
	  "favorite_camera": "SonyF65",
	  "favorite_movies": ["Lawrence of Arabia", "Fantasia"],
	  "_action": <"add"|"remove">
	}

`"_action"` is an optional key that if present will change how
`"favorite_movies"` is updated. Set to `"add"` it will add to the
existing `"favorite_movies"` set, set to `"remove"` it will remove the
movies from the existing `"favorite_movies"` set, and set to any other
value (or not present) the existing `"favorite_movies"` set will be
replaced. It has no effect on how `"favorite_camera"` is handled.

Any attributes not present in the JSON object will not be updated.

The request must include the header `Authorization: Bearer
md5(FullNameOfTheAccountToModify)`, e.g. `Authorization: Bearer
1bef1e4f8ea440a6323f9d25a5b4bd1b`.

The response will be the director's JSON object:

	{
	  "livestream_id": "6488818",
	  "full_name": "Steven Speilberg",
	  "dob": "2012‐06‐26T06:07:15.000Z",
	  "favorite_camera": "SonyF65",
	  "favorite_movies": ["Lawrence of Arabia", "Fantasia"]
	}

### GET /directors/:livestream_id

Returns a single director:

	{
	  "livestream_id": "6488818",
	  "full_name": "Steven Speilberg",
	  "dob": "2012‐06‐26T06:07:15.000Z",
	  "favorite_camera": "SonyF65",
	  "favorite_movies": ["Lawrence of Arabia", "Fantasia"]
	}

### Response Codes

| Code | Message      | Description                                 |
|------|--------------|---------------------------------------------|
| 200  | OK           | Invoked operation is executed successfully. |
| 400  | Client Error | There are missing or invalid parameters for the requested operation. |
| 401  | Unauthorized Client Error | The authorization header doesn't match the `livestream_id` |
| 404  | Resource Not Found | The requested resource does not exist. |
| 500  | Server Error | Server error may occur when there is an error with the local database or connecting to the livestream API. |


## Implementation Details

The express package is used to serve up the API. The directors are
stored locally in a Redis database. The key for a director is
`directors:<livestream_id>`, and the key `directors:index` is used to
store a set of all director keys to allow for retreiving all directors
at once. Rather than storing director attributes in a Redis datatype
(such as using a hash for `full_name`, `dob`, etc. and a set for
`favorite_movies`), the value for each director is simply a serialized
JSON representation of the director. This allows for fast and simple
retreival of directors with a minimal amount of parsing
logic. However, it does mean that a directors attributes can't be
accessed individually, the whole director object must be retreived to
update anything, and the logic for making `favorite_movies` a set must
be done in JavaScript rather than leveraging Redis sets. I considered
these acceptable drawbacks for the scope of this API since the slowest
operation will be indexing. Creation and updates only rely on one
record with simple validation logic. However, if the API grows, the
cost-benefit analysis may change, and it could eventually be
beneficial to switch over to a full ORM for the director model.

Inside `director_controller.js` I used the async package to refactor
the controller actions. Because two async packages are being used
(`request` for querying the livestream API and `redis` for accessing
the local database), the initial implementations were spaghetti code,
with the error handling logic mixed in with the next callback. The
refactored versions centralized the error conditions using
`async.waterfall` to pass results to the next function.

## Testing

There is full unit test coverage for the `Director` model, and
integration testing for the API. I didn't do unit testing on the
controller since the integration tests check for the results from the
API. The tests could be split up to unit testing of the controller
functions, and integration testing that just checks for server
responses to the API endpoints.

The access to the livestream API is mocked through the `nock`
package. This allows testing to not be reliant on the livestream API
being up and responding quickly, and to make tests hammer livestream's
servers each time they're run. It also allows me to simulate error on
the livestream end by having my mock respond with 500 errors.

## File Guide

`app.js` sets up express and mounts the directors controller. Mostly
made by the express generator.

`db.js` sets up the connection to the Redis database.

`app/controllers/directors_controller.js` has the `create`, `update`,
`index`, and `show` actions called by the router.

`app/models/directors.js` has the business logic, livestream API
access, and Redis database access for the Director model.

`bin/www` starts the server. Entirely made by the express generator.

`routes/directors.js` sets up the router that wires the API to the
actions.

`test/api.js` has the integration tests for the API.

`test/helpers/livestream_api.js` has a helper for mocking access to
the livestream API.

`test/models/director.js` has unit tests for the Director model.
