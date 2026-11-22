
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Méthode non autorisée"
    });
  }

  return res.status(200).json({
    application: "MADARA TOP UP",
    status: "online",
    hosting: "Vercel",
    backend: "Vercel Functions",
    database: "not_configured",
    payments: "not_configured",
    playerVerification: "not_configured"
  });
}
