import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  credentials: true
}));
app.use(cookieParser(process.env.APP_SESSION_SECRET));
app.use(express.json());

function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomString(bytes = 32) {
  return base64url(crypto.randomBytes(bytes));
}

/**
 * Step 1: redirect user to LinkedIn authorization endpoint
 * Authorization endpoint: https://www.linkedin.com/oauth/v2/authorization :contentReference[oaicite:4]{index=4}
 */
app.get("/auth/linkedin", (req, res) => {
  const state = randomString(24);

  // store state in signed cookie to validate callback
  res.cookie("li_state", state, {
    httpOnly: true,
    sameSite: "lax",
    signed: true
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
    state,
    scope: "openid profile email",
    prompt: "login"
  });

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
});

/**
 * Step 2: LinkedIn redirects back with ?code=...&state=...
 * Exchange code for token at: https://www.linkedin.com/oauth/v2/accessToken :contentReference[oaicite:5]{index=5}
 */
app.get("/auth/linkedin/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    const cookieState = req.signedCookies?.li_state;
    if (!code || !state || !cookieState || state !== cookieState) {
      return res.status(400).send("Invalid state. Please try again.");
    }

    // Exchange code -> token
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET
    });

    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString()
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      return res.status(502).send(`Token exchange failed: ${txt}`);
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    // Fetch userinfo (OIDC)
    const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!meRes.ok) {
      const txt = await meRes.text();
      return res.status(502).send(`Userinfo failed: ${txt}`);
    }

    const me = await meRes.json();

    // Put minimal profile in a cookie for the frontend to fetch (tiny demo approach)
    res.cookie("li_profile", JSON.stringify({
      sub: me.sub,
      name: me.name,
      given_name: me.given_name,
      family_name: me.family_name,
      email: me.email,
      picture: me.picture,
      locale: me.locale
    }), {
      httpOnly: false,     // demo-only; in a real app you'd keep this server-side
      sameSite: "lax"
    });

    // Send user back to frontend
    res.redirect(`${process.env.FRONTEND_ORIGIN}/`);
  } catch (e) {
    res.status(500).send(e?.message || "Server error");
  }
});

app.get("/api/me", (req, res) => {
  try {
    const raw = req.cookies?.li_profile;
    if (!raw) return res.status(401).json({ error: "Not signed in" });
    return res.json(JSON.parse(raw));
  } catch {
    return res.status(400).json({ error: "Bad profile cookie" });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("li_profile");
  res.clearCookie("li_state");
  res.json({ ok: true });
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Backend listening on http://localhost:${process.env.PORT || 3001}`);
});
