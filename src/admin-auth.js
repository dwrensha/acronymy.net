import { jwtVerify, createRemoteJWKSet } from "jose";

export async function check_admin_auth(req, env) {
    if (req.headers.host != "admin.acronymy.net") {
      return {"ok" : true};
    }

    if (!env.POLICY_AUD) {
      return { "error" : "Missing required audience"}
    }

    // Get the JWT from the request headers
    const token = req.headers.get("cf-access-jwt-assertion");

    // Check if token exists
    if (!token) {
      return { "error" : "Missing required CF Access JWT"}
    }

    try {
      // Create JWKS from your team domain
      const JWKS = createRemoteJWKSet(
        new URL(`${env.TEAM_DOMAIN}/cdn-cgi/access/certs`),
      );

      // Verify the JWT
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: env.TEAM_DOMAIN,
        audience: env.POLICY_AUD,
      });

      // Token is valid, proceed with your application logic
      req.is_admin = true
      return { "ok" : true };
    } catch (error) {
      // Token verification failed
      const message = error instanceof Error ? error.message : "Unknown error";
      return {"error" : `Failed to validate token: ${message}`}
    }
}
