
interface Env {
  DB: D1Database;
  ADMIN_EMAIL: string;
  ALLOWED_ORIGIN: string;
}

interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 310000,
      hash: "SHA-256"
    },
    key,
    256
  );

  const bytes = new Uint8Array(bits);
  const toHex = (array: Uint8Array) =>
    Array.from(array).map(x => x.toString(16).padStart(2, "0")).join("");

  return `${toHex(salt)}:${toHex(bytes)}`;
}

async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, expectedHex] = stored.split(":");

  if (!saltHex || !expectedHex) return false;

  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)!.map(x => parseInt(x, 16))
  );

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 310000,
      hash: "SHA-256"
    },
    key,
    256
  );

  const actual = Array.from(new Uint8Array(bits))
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");

  return actual === expectedHex;
}

function createToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
}

async function getUser(request: Request, env: Env): Promise<User | null> {
  const cookie = request.headers.get("Cookie") || "";
  const token = cookie.match(/madara_session=([a-f0-9]+)/)?.[1];

  if (!token) return null;

  const session = await env.DB.prepare(`
    SELECT users.id, users.email, users.password_hash, users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
      AND sessions.expires_at > datetime('now')
  `).bind(await sha256(token)).first<User>();

  return session || null;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );

  return Array.from(new Uint8Array(digest))
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
}

function sessionCookie(token: string): string {
  return `madara_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`;
}

async function handle(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (path === "/api/health" && method === "GET") {
    try {
      await env.DB.prepare("SELECT 1").first();
      return json({
        application: "MADARA TOP UP",
        server: "online",
        database: "online",
        payments: "not_configured",
        playerVerification: "not_configured"
      });
    } catch {
      return json({ error: "Database unavailable" }, 503);
    }
  }

  // Inscription client
  if (path === "/api/auth/register" && method === "POST") {
    const body = await request.json() as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password || "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Adresse email invalide." }, 400);
    }

    if (password.length < 10 || password.length > 128) {
      return json({ error: "Mot de passe : 10 à 128 caractères." }, 400);
    }

    const existing = await env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind(email).first();

    if (existing) {
      return json({ error: "Ce compte existe déjà." }, 409);
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await env.DB.prepare(`
      INSERT INTO users (id, email, password_hash, role)
      VALUES (?, ?, ?, 'customer')
    `).bind(id, email, passwordHash).run();

    return json({
      success: true,
      message: "Compte créé. Tu peux maintenant te connecter."
    }, 201);
  }

  // Connexion
  if (path === "/api/auth/login" && method === "POST") {
    const body = await request.json() as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password || "";

    if (!email || !password) {
      return json({ error: "Identifiants manquants." }, 400);
    }

    const user = await env.DB.prepare(`
      SELECT id, email, password_hash, role
      FROM users WHERE email = ?
    `).bind(email).first<User>();

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return json({ error: "Identifiants incorrects." }, 401);
    }

    const token = createToken();
    const tokenHash = await sha256(token);

    await env.DB.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, datetime('now', '+30 days'))
    `).bind(
      crypto.randomUUID(),
      user.id,
      tokenHash
    ).run();

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    }), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": sessionCookie(token),
        "Cache-Control": "no-store"
      }
    });
  }

  // Déconnexion
  if (path === "/api/auth/logout" && method === "POST") {
    const cookie = request.headers.get("Cookie") || "";
    const token = cookie.match(/madara_session=([a-f0-9]+)/)?.[1];

    if (token) {
      await env.DB.prepare(
        "DELETE FROM sessions WHERE token_hash = ?"
      ).bind(await sha256(token)).run();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "madara_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
      }
    });
  }

  // Profil client
  if (path === "/api/auth/me" && method === "GET") {
    const user = await getUser(request, env);

    if (!user) return json({ error: "Connexion requise." }, 401);

    return json({
      id: user.id,
      email: user.email,
      role: user.role
    });
  }

  // Vérification réelle du joueur : fournisseur à connecter
  if (path === "/api/player/verify" && method === "POST") {
    const user = await getUser(request, env);

    if (!user) return json({ error: "Connexion requise." }, 401);

    return json({
      success: false,
      error: "Le fournisseur de vérification Free Fire n'est pas encore connecté."
    }, 503);
  }

  // Création de commande : désactivée jusqu'à la configuration du catalogue
  if (path === "/api/orders" && method === "POST") {
    const user = await getUser(request, env);

    if (!user) return json({ error: "Connexion requise." }, 401);

    return json({
      error: "Les commandes seront activées après configuration du catalogue et du fournisseur."
    }, 503);
  }

  // Historique client
  if (path === "/api/orders" && method === "GET") {
    const user = await getUser(request, env);

    if (!user) return json({ error: "Connexion requise." }, 401);

    const result = await env.DB.prepare(`
      SELECT id, country, package_id, status, created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).bind(user.id).all();

    return json({ orders: result.results });
  }

  // Tableau administrateur
  if (path === "/api/admin/dashboard" && method === "GET") {
    const user = await getUser(request, env);

    if (!user || user.role !== "admin" ||
        user.email !== env.ADMIN_EMAIL.toLowerCase()) {
      return json({ error: "Accès refusé." }, 403);
    }

    const total = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM orders"
    ).first<{ total: number }>();

    const paid = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM orders WHERE status IN ('paid','processing','completed')"
    ).first<{ total: number }>();

    const completed = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM orders WHERE status = 'completed'"
    ).first<{ total: number }>();

    return json({
      totalOrders: total?.total || 0,
      paidOrders: paid?.total || 0,
      completedOrders: completed?.total || 0,
      netProfitFormatted: "Non disponible",
      orders: []
    });
  }

  // Paiement : aucune collecte réelle avant activation du prestataire
  if (path.startsWith("/api/payments")) {
    return json({
      error: "Prestataire de paiement non configuré. Aucun paiement n'a été effectué."
    }, 503);
  }

  if (path === "/api/auth/google") {
    return json({
      error: "La connexion Google nécessite une configuration OAuth officielle."
    }, 503);
  }

  return json({ error: "Route introuvable." }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const allowedOrigin = env.ALLOWED_ORIGIN;

    if (origin && origin !== allowedOrigin) {
      return json({ error: "Origine non autorisée." }, 403);
    }

    try {
      const response = await handle(request, env);
      const headers = new Headers(response.headers);

      if (origin && origin === allowedOrigin) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Access-Control-Allow-Credentials", "true");
        headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type");
        headers.set("Vary", "Origin");
      }

      return new Response(response.body, {
        status: response.status,
        headers
      });
    } catch {
      return json({ error: "Erreur interne du serveur." }, 500);
    }
  }
};
