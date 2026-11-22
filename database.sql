
-- ==========================================
-- MADARA TOP UP
-- Base de données Cloudflare D1
-- ==========================================

PRAGMA foreign_keys = ON;

-- CLIENTS
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer'
        CHECK(role IN ('customer', 'admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- CATALOGUE DES OFFRES
CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    package_type TEXT NOT NULL
        CHECK(package_type IN ('diamonds', 'weekly', 'monthly')),
    diamond_quantity INTEGER,
    active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- COMMANDES
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_nickname TEXT,
    country TEXT NOT NULL,
    package_id TEXT NOT NULL,
    currency TEXT,
    amount INTEGER,
    supplier_cost INTEGER,
    payment_fee INTEGER DEFAULT 0,
    net_profit INTEGER,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN (
            'pending',
            'awaiting_payment',
            'paid',
            'processing',
            'completed',
            'failed',
            'refunded'
        )),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(package_id) REFERENCES packages(id)
);

-- PAIEMENTS
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_reference TEXT UNIQUE,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'confirmed', 'failed', 'refunded')),
    confirmed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id)
);

-- HISTORIQUE DES ÉVÉNEMENTS DE COMMANDE
CREATE TABLE IF NOT EXISTS order_events (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id)
);

-- RÉFÉRENCES DE TRANSACTIONS FOURNISSEUR
CREATE TABLE IF NOT EXISTS supplier_transactions (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    supplier_reference TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id)
);

-- INDEX POUR LES RECHERCHES
CREATE INDEX IF NOT EXISTS idx_sessions_user
ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expiration
ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_orders_user
ON orders(user_id);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_date
ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_payments_order
ON payments(order_id);

CREATE INDEX IF NOT EXISTS idx_events_order
ON order_events(order_id);

-- FIN
