# EOD Stock API - Cloudflare Cache Worker

This Cloudflare Cache Worker is designed to handle traffic going to and from backend servers. 
It ensures that only authorized requests are passed on to the backend servers, and caches the results for a 
minimum of three hours.

## Features
Validates requests based on the X-API-KEY, X-SECRET-TOKEN, and X-RapidAPI-Proxy-Secret headers.
Adds a digital signature to requests based on the X-Secret-key header.
Caches results for a minimum of three hours.
Works with multiple backend servers.
Uses a custom SHA-256 hashing algorithm.

## Installation
Copy the code from the index.js file.
Create a new Cloudflare Worker and paste the code.
Save and deploy the worker.

## Usage
The worker will automatically intercept requests and validate the headers. If the headers are valid, the request is passed on to the backend server, and the response is cached for a minimum of three hours.

## Configuration
The following configuration options are available:

- gateway_hosts: An array of hostnames that are allowed to make requests to the backend servers.
- cacheTtl: The time in seconds that the response should be cached for.
- cacheEverything: Whether to cache all responses or only those with a cache control header.
- cacheKey: A unique key to use for caching the response. 
These options can be set in the worker's code.

## Contributing
We welcome contributions to this Cloudflare Cache Worker. If you have an idea for an improvement or a new feature, please create a pull request.

## License
This Cloudflare Cache Worker is released under the MIT license. See the LICENSE file for more details.