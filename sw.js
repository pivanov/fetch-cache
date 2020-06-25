// Name of the cache
const CACHE_NAME = "cache";

// Caching duration is 30 seconds for demo purpose
const DEFAULT_CACHING_DURATION = 30;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const CACHING_DURATION = Number(request.headers.get("sw-cache-for-seconds")) || DEFAULT_CACHING_DURATION

  event.respondWith(caches.open(`${CACHE_NAME}-tiles`).then(
    cache => cache.match(request).then(
      (response) => {
        // If there is a match from the cache
        if (response) {
          const expirationDate = Date.parse(response.headers.get('sw-cache-expires'));
          const now = new Date();

          if (expirationDate > now) {
            return response;
          }
        }

        // Otherwise, let's fetch it from the network
        return fetch(request.url).then((liveResponse) => {

          // let's only store in cache if the content-type is
          // JSON or something non-binary
          const ct = liveResponse.headers.get('Content-Type');
          if (ct && (ct.match(/application\/json/i))) {
            // Compute expires date from caching duration
            const expires = new Date();
            expires.setSeconds(expires.getSeconds() + CACHING_DURATION);

            // Recreate a Response object from scratch to put
            // it in the cache, with the extra header for
            // managing cache expiration.
            const cachedResponseFields = {
              status: liveResponse.status,
              statusText: liveResponse.statusText,
              headers: { 'SW-Cache-Expires': expires },
            };

            liveResponse.headers.forEach((v, k) => {
              cachedResponseFields.headers[k] = v;
            });

            // We will consume body of the live response, so
            // clone it before to be able to return it
            // afterwards.
            const returnedResponse = liveResponse.clone();

            return liveResponse.blob().then((body) => {
              // Put the duplicated Response in the cache
              cache.put(request, new Response(body, cachedResponseFields));

              // Return the live response from the network
              return returnedResponse;
            });
          }

          return liveResponse;
        });
      })
  ));
});
