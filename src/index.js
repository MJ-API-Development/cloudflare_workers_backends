
// Cache the TextEncoder object

const encoder = new TextEncoder();

// Check if we are running in a Cloudflare Worker environment
// noinspection JSUnresolvedVariable
if (typeof __non_webpack_require__ !== 'undefined') {
  // Use __non_webpack_require__ to import the crypto library
  // noinspection JSUnresolvedVariable
  const crypto = __non_webpack_require__('crypto');
}

export default {
  async fetch(request, env) {
   
    const { host, pathname } = new URL(request.url);
    // The reason both backend servers are listed as hosts is because rapid api uses them, as hosts
    // const gateway_hosts = ["gateway.eod-stock-api.site","www.eod-stock-api.site", "cron.eod-stock-api.site"];
    // const backend_hosts = ["www.eod-stock-api.site", "cron.eod=stock-api.site"];
    const gateway_hosts = env.allowedHosts.split(",");

    if (gateway_hosts.includes(host)) {
      return await handleBackEndTraffic(request, env);
    }     

    const response_message = { message: `Request not authorized : Bad Gateway Server : ${host}${pathname}` };
    return new Response(JSON.stringify(response_message), { status: 401 });
  }
};

async function sha256(message) {
  /**
   * MY Sha 256 Algorithm
   * @type {Uint8Array}
   */
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.prototype.map
    .call(new Uint8Array(hashBuffer), (x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}


async function is_signature_valid(signature, request, secret) {
  /**
   * signature has to come from backend
   * @type {boolean}
   */
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const headers = request.headers;
  const expectedSignature = await sha256(`${method}${url}${headers}${secret}`);
  return signature === expectedSignature;
}


async function createCacheKey(apiKey, secretToken, proxySecret, pathname) {
  /**
   * creating a hashed cache Signature
   * @type {Uint8Array}
   */
  return await sha256(`${pathname}-${apiKey}-${secretToken}-${proxySecret}`);
}


async function handleBackEndTraffic(request, env){
  /**
   * Traffic going to and from each of the several backend servers will pass through here
   * The only servers that can call the backend servers are the two GateWay Servers
   */
  const { host, pathname } = new URL(request.url);
  //TODO please use env variables here
  const gateway_hosts = ["gateway.eod-stock-api.site","www.eod-stock-api.site", "cron.eod-stock-api.site"];
  // const gateway_hosts = env.allowedHosts.split(",");

    // if requests are here then it must be the gateway or rapid api making this request
  if (pathname.startsWith("/api/v1")) {
    
    const apiKey = request.headers.get("X-API-KEY");
    const secretToken = request.headers.get("X-SECRET-TOKEN");
    const proxySecret = request.headers.get("X-RapidAPI-Proxy-Secret");

    // Check if headers contain valid values
    if (!apiKey || !secretToken || !proxySecret) {
      const response_message = { message: "Request not authorized" };
      return new Response(JSON.stringify(response_message), { status: 401 });
    }

    // Add digital signature based on the X-Secret-key header
    const signature = request.headers.get['X-Signature']

    let is_valid_signature = await is_signature_valid(signature, request, secretToken);

    const gateway_host = "gateway.eod-stock-api.site";

    if (!is_valid_signature && (host.toLowerCase() === gateway_host)){
      // Rapid API is not yet able to create signatures
      const response_message = { message: "Request not authorized : Invalid Signature" };
      return new Response(JSON.stringify(response_message), { status: 401 });
    }    

    const cacheKey = await createCacheKey(apiKey, secretToken, proxySecret, pathname);

    return await fetch(request, {
      // NOTE: This request will go to one of two BackEndServers
      // Results are cached Here for a minimum of 3 Hours
      cf: {
        cacheTtl: 10800, // 3 hours
        cacheEverything: true,
        cacheKey: cacheKey,
      },
    });
    }

    return await fetch(request);
}
