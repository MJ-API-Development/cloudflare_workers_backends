

export default {
  async fetch(request, env) {
   
    const { host, pathname } = new URL(request.url);
    // The reason both backend servers are listed as hosts is because rapid api uses them, as hosts
    const gateway_hosts = ["gateway.eod-stock-api.site","www.eod-stock-api.site", "cron.eod-stock-api.site"];

    // const backend_hosts = ["www.eod-stock-api.site", "cron.eod=stock-api.site"];

    if (gateway_hosts.includes(host)) {
      console.log(`fetching from gateway ${request.url}`)
      return await handleBackEndTraffic(request, env);
    }     

    const response_message = { message: `Request not authorized : Bad Gateway Server : ${host}` };
    return new Response(JSON.stringify(response_message), { status: 401 });
       
  }
};


// Cache the TextEncoder object
const encoder = new TextEncoder();

// Check if we are running in a Cloudflare Worker environment
if (typeof __non_webpack_require__ !== 'undefined') {
  // Use __non_webpack_require__ to import the crypto library
  const crypto = __non_webpack_require__('crypto');
}

async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = Array.prototype.map
    .call(hashArray, (x) => ("00" + x.toString(16)).slice(-2))
    .join("");

  return hashHex;
}

async function encodeSignature(request, secret) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const headers = request.headers;

  return await sha256(`${method}${url}${headers}${secret}`);
}

async function is_signature_valid(signature, request, secret) {
  /**
   * signature has to come from backend 
   * 
   */

  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const headers = request.headers;

  const expectedSignature = await sha256(`${method}${url}${headers}${secret}`);

  return signature === expectedSignature;

}


async function createCacheKey(apiKey, secretToken, proxySecret, pathname) {
  return await sha256(`${pathname}-${apiKey}-${secretToken}-${proxySecret}`);
}




async function handleGateWayTraffic(request, env){
  /**
   * Traffic going to and from the gateway will pass through this method
   * AS of Now no traffic should pass through here
   * lets see how this works
   */

  return await fetch(request);

}



async function handleBackEndTraffic(request, env){
  /**
   * Traffic going to and from each of the several backend servers will pass through here
   * The only servers that can call the backend servers are the two GateWay Servers
   */
  const { host, pathname } = new URL(request.url);

  const gateway_hosts = ["gateway.eod-stock-api.site","stock-api6.p.rapidapi.com"];

  console.log(`Fetching content for backend end ${request.url}`)

    // if requests are here then it must be the gateway or rapid api making this request
  if (pathname.startsWith("/api/v1")) {
    
    const apiKey = request.headers.get("X-API-KEY");
    const secretToken = request.headers.get("X-SECRET-TOKEN");
    const proxySecret = request.headers.get("X-RapidAPI-Proxy-Secret");

    console.log(`Headers : ${request.headers}`)
    // Check if headers contain valid values
    if (!apiKey || !secretToken || !proxySecret) {
      const response_message = { message: "Request not authorized" };
      return new Response(JSON.stringify(response_message), { status: 401 });
    }

    // Add digital signature based on the X-Secret-key header
    const signature = request.headers.get['X-Signature']

    let is_valid_signature = await is_signature_valid(signature, request, secretToken);

    const gateway_host = gateway_hosts[0];

    if (!is_valid_signature & (host.toLowerCase() == gateway_host)){
      const response_message = { message: "Request not authorized : Invalid Signature" };
      return new Response(JSON.stringify(response_message), { status: 401 });
    }    

    const cacheKey = await createCacheKey(apiKey, secretToken, proxySecret, pathname);

    let response = await fetch(request, {
      // this request will go to one of two BackEndServers
      cf: {
        cacheTtl: 10800, // 3 hours
        cacheEverything: true,
        cacheKey: cacheKey,
      },
    });

      return response;

    }

  
    return await fetch(request);

}
