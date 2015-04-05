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

Requests and responses to the API are made with JSON. For a request to
update a directors attributes, there must be an MD5 sum of the
director's livestream id in a header. This at least stops casual
unauthorized access.

### Api Endpoints

#### GET /directors

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

#### POST /directors

Creates a new director. The body of the post must be a JSON object
with a valid livestream id:

    {
	  "livestream_id": "6488818"
	}

Responds with the created director object:

    {
	  "livestream_id": "6488818",
	  "full_name": "Steven Speilberg",
	  "dob": "2012‐06‐26T06:07:15.000Z"
	}

The director with the livestream id must not have already been created
on the system, otherwise the response will be a 422 error.

#### POST /directors/:livestream_id

Updates a director. Only the `favorite_camera` and `favorite_movies`
attributes can be updated. `livestream_id`, `full_name`, and `dob` are
immutable, and come from the livestream account. The body of the post
must be a JSON object with the values to update:

    {
	  "favorite_camera": "SonyF65",
	  "favorite_movies": ["Lawrence of Arabia", "Fantasia"]
	}

The request must include the header `Authorization: Bearer
md5(FullNameOfTheAccountToModify)`, e.g. `Authorization: Bearer
1bef1e4f8ea440a6323f9d25a5b4bd1b`.

The response will be the directors JSON object:

	{
	  "livestream_id": "6488818",
	  "full_name": "Steven Speilberg",
	  "dob": "2012‐06‐26T06:07:15.000Z",
	  "favorite_camera": "SonyF65",
	  "favorite_movies": ["Lawrence of Arabia", "Fantasia"]
	}

#### GET /directors/:livestream_id

Lists a director:

	{
	  "livestream_id": "6488818",
	  "full_name": "Steven Speilberg",
	  "dob": "2012‐06‐26T06:07:15.000Z",
	  "favorite_camera": "SonyF65",
	  "favorite_movies": ["Lawrence of Arabia", "Fantasia"]
	}

### Response Codes

| Code | Message      | Description                                 |
|-------------------------------------------------------------------|
| 200  | OK           | Invoked operation is executed successfully. |
| 400  | Client Error | There are missing or invalid parameters for the requested operation. |
| 401  | Unauthorized Client Error | The authorization header doesn't match the `livestream_id` |
| 500  | Server Error | Server error may occur when there is an error with the local database or connecting to the livestream API. |


## Implementation Details

The express package is used to serve up the API.
