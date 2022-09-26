/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

async function handleRequest(req) {
  console.log(req.url);
  let value = await WORDS.get("posit");
  return (new Response("Hello World. definition of 'posit': " + value));
}

addEventListener('fetch', event => {
  return event.respondWith(handleRequest(event.request));
});
