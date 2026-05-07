import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import cookieParser from "cookie-parser";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Gemini Proxy
app.post("/api/gemini", async (req, res) => {
  try {
    const { prompt, model = "gemini-1.5-flash" } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing in environment variables.");
      return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.json({ text });
  } catch (error: any) {
    console.error("Gemini Proxy Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch from Gemini API" });
  }
});

async function start() {
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

  // Only listen if not running as a Vercel function
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

start();

export default app;
