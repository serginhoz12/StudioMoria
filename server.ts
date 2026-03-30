import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import cookieParser from "cookie-parser";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(session({
    secret: "salon-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: true, 
      sameSite: 'none',
      httpOnly: true 
    }
  }));

  // Instagram OAuth Config
  const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
  const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
  
  // Get the App URL from environment or construct it
  // In this environment, we should use the provided APP_URL
  const APP_URL = process.env.APP_URL || "http://localhost:3000";
  const REDIRECT_URI = `${APP_URL}/api/auth/instagram/callback`;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 1. Get Instagram Auth URL
  app.get("/api/auth/instagram/url", (req, res) => {
    if (!INSTAGRAM_CLIENT_ID) {
      return res.status(500).json({ error: "INSTAGRAM_CLIENT_ID not configured" });
    }
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=user_profile,user_media&response_type=code`;
    res.json({ url: authUrl });
  });

  // 2. Instagram Callback
  app.get("/api/auth/instagram/callback", async (req, res) => {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send("No code provided");
    }

    try {
      // Exchange code for access token
      const tokenResponse = await axios.post(
        "https://api.instagram.com/oauth/access_token",
        new URLSearchParams({
          client_id: INSTAGRAM_CLIENT_ID!,
          client_secret: INSTAGRAM_CLIENT_SECRET!,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
          code: code as string,
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const { access_token, user_id } = tokenResponse.data;

      // Get user profile
      const profileResponse = await axios.get(
        `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${access_token}`
      );

      const { username } = profileResponse.data;

      // Send success message to parent window and close popup
      // We'll pass the instagram data back to the client
      const instagramData = {
        id: user_id,
        username: username,
        profileUrl: `https://www.instagram.com/${username}/`
      };

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'INSTAGRAM_AUTH_SUCCESS', 
                  data: ${JSON.stringify(instagramData)} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Autenticação com Instagram concluída com sucesso! Esta janela fechará automaticamente.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Instagram Auth Error:", error.response?.data || error.message);
      res.status(500).send("Erro na autenticação com Instagram");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
