// Copied from https://developers.cloudflare.com/workers/examples/basic-auth/

import { Buffer } from "node:buffer";

const encoder = new TextEncoder();

/**
 * Protect against timing attacks by safely comparing values using `timingSafeEqual`.
 * Refer to https://developers.cloudflare.com/workers/runtime-apis/web-crypto/#timingsafeequal for more details
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function timingSafeEqual(a, b) {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  if (aBytes.byteLength !== bBytes.byteLength) {
    // Strings must be the same length in order to compare
    // with crypto.subtle.timingSafeEqual
    return false;
  }

  return crypto.subtle.timingSafeEqual(aBytes, bBytes);
}


export function authorization_header_validates_as_admin(admin_password, authorization) {
  const [scheme, encoded] = authorization.split(" ");
  // The Authorization header must start with Basic, followed by a space.
  if (!encoded || scheme !== "Basic") {
    return false;
  }

  const credentials = Buffer.from(encoded, "base64").toString();

  // The username & password are split by the first colon.
  //=> example: "username:password"
  const index = credentials.indexOf(":");
  const user = credentials.substring(0, index);
  const pass = credentials.substring(index + 1);


  if (!timingSafeEqual("admin", user) ||
      !timingSafeEqual(admin_password, pass)) {
    return false;
  }
  return true;
}

export function bounce_if_not_authed(env, request) {
  if (!env.ADMIN_PASSWORD) {
    return new Response("Admin password is not configured.", {
      status: 403,
    });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) {
    return new Response("You need to login.", {
      status: 401,
      headers: {
        // Prompts the user for credentials.
        "WWW-Authenticate": 'Basic realm="my scope", charset="UTF-8"',
      },
    });
  }
  if (!authorization_header_validates_as_admin(env.ADMIN_PASSWORD, authorization)) {
    return new Response("You need to login.", {
      status: 401,
      headers: {
        // Prompts the user for credentials.
        "WWW-Authenticate": 'Basic realm="my scope", charset="UTF-8"',
      },
    });
  }

  // returning null means auth succeeded.
  return null;
}
