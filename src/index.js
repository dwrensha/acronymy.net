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
}

export default {
  async fetch(req, env) {
    let url = new URL(req.url);
    console.log("path = ", url.pathname);

    let value = await env.WORDS.get("posit");
    return (new Response("Hello World. definition of 'posit': " + value));
  }
}
