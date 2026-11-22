
/*
 * MADARA TOP UP
 * Gestion sécurisée des commandes
 *
 * API à connecter au backend Cloudflare :
 * POST /api/orders
 * GET  /api/orders
 * GET  /api/orders/:id
 */

const MadaraOrders = (() => {
  const API = "/api/orders";

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Impossible de traiter la demande.");
    }

    return data;
  }

  async function create(order) {
    if (!order || !order.playerId || !order.country ||
        !order.packageId) {
      throw new Error("Informations de commande incomplètes.");
    }

    return request(API, {
      method: "POST",
      body: JSON.stringify({
        playerId: String(order.playerId),
        country: order.country,
        packageId: order.packageId
      })
    });
  }

  async function history() {
    const data = await request(API, {
      method: "GET"
    });

    return Array.isArray(data.orders) ? data.orders : [];
  }

  async function details(orderId) {
    if (!orderId) {
      throw new Error("Identifiant de commande manquant.");
    }

    return request(API + "/" + encodeURIComponent(orderId));
  }

  function formatStatus(status) {
    const labels = {
      pending: "En attente",
      awaiting_payment: "En attente de paiement",
      paid: "Paiement confirmé",
      processing: "Recharge en cours",
      completed: "Recharge terminée",
      failed: "Échec",
      refunded: "Remboursée"
    };

    return labels[status] || "Statut inconnu";
  }

  return {
    create,
    history,
    details,
    formatStatus
  };
})();

window.MadaraOrders = MadaraOrders;
