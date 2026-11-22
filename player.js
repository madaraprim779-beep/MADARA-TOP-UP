
/*
 * MADARA TOP UP
 * Vérification du joueur Free Fire
 *
 * Le backend devra exposer :
 * POST /api/player/verify
 *
 * Réponse attendue :
 * {
 *   "success": true,
 *   "player": {
 *     "id": "123456789",
 *     "nickname": "Pseudo réel"
 *   }
 * }
 */

const MadaraPlayer = (() => {
  const API_URL = "/api/player/verify";

  const elements = {
    id: document.getElementById("playerId"),
    button: document.getElementById("verifyButton"),
    message: document.getElementById("playerMessage"),
    nickname: document.getElementById("summaryNickname")
  };

  let verifiedPlayer = null;

  function showMessage(message) {
    if (!elements.message) return;

    elements.message.textContent = message;
    elements.message.style.display = "block";
  }

  function clearVerification() {
    verifiedPlayer = null;

    if (elements.nickname) {
      elements.nickname.textContent = "En attente";
    }
  }

  async function verify() {
    const id = elements.id?.value.trim();

    if (!id || !/^[0-9]{5,30}$/.test(id)) {
      clearVerification();
      showMessage("Entre un ID Free Fire valide.");
      return;
    }

    if (elements.button) {
      elements.button.disabled = true;
      elements.button.textContent = "Vérification...";
    }

    clearVerification();

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ playerId: id })
      });

      const data = await response.json();

      if (!response.ok || !data.success ||
          !data.player ||
          String(data.player.id) !== id ||
          typeof data.player.nickname !== "string" ||
          !data.player.nickname.trim()) {
        throw new Error("Joueur non vérifié.");
      }

      verifiedPlayer = {
        id,
        nickname: data.player.nickname.trim()
      };

      if (elements.nickname) {
        elements.nickname.textContent = verifiedPlayer.nickname;
      }

      showMessage("Joueur vérifié : " + verifiedPlayer.nickname);

    } catch (error) {
      clearVerification();
      showMessage(
        "Vérification indisponible. Réessaie lorsque le service sera connecté."
      );
    } finally {
      if (elements.button) {
        elements.button.disabled = false;
        elements.button.textContent = "Vérifier mon ID";
      }
    }
  }

  elements.button?.addEventListener("click", verify);

  elements.id?.addEventListener("input", () => {
    clearVerification();

    if (elements.message) {
      elements.message.style.display = "none";
    }
  });

  return {
    verify,
    getVerifiedPlayer: () => verifiedPlayer
  };
})();

window.MadaraPlayer = MadaraPlayer;
