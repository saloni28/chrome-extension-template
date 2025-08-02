// ========== Configuration ==========
const CLOUD_RUN_URL = "https://your-cloud-run-url.run.app";  // Replace with your backend URL
const TOKEN_EXPIRY_BUFFER = 300; // 5 minutes

// ========== Token Cache Utilities ==========
async function getCachedToken() {
  const result = await chrome.storage.local.get(["idToken", "tokenTimestamp"]);
  return {
    idToken: result.idToken || null,
    tokenTimestamp: result.tokenTimestamp || null
  };
}

function setCachedToken(idToken, tokenTimestamp) {
  chrome.storage.local.set({ idToken, tokenTimestamp });
}

function clearCachedToken() {
  chrome.storage.local.remove(["idToken", "tokenTimestamp"]);
}

// ========== Google OAuth via chrome.identity ==========
function getIapIdentityTokenViaWebAuth(callback) {
  const manifest = chrome.runtime.getManifest();
  const clientId = encodeURIComponent(manifest.oauth2.client_id);
  const scopes = encodeURIComponent(manifest.oauth2.scopes.join(" "));
  const redirectUri = encodeURIComponent(`https://${chrome.runtime.id}.chromiumapp.org`);

  const url =
    "https://accounts.google.com/o/oauth2/auth" +
    `?client_id=${clientId}` +
    `&response_type=id_token` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${scopes}` +
    `&prompt=consent`;

  chrome.identity.launchWebAuthFlow({ url, interactive: true }, function (redirectedTo) {
    if (chrome.runtime.lastError) {
      callback(null);
      return;
    }

    const params = new URLSearchParams(redirectedTo.split("#")[1]);
    const idToken = params.get("id_token");

    if (idToken) {
      try {
        const payload = JSON.parse(atob(idToken.split(".")[1]));
        const tokenTimestamp = payload.exp;
        setCachedToken(idToken, tokenTimestamp);
        callback(idToken);
      } catch (e) {
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}

// ========== Authenticated Fetch via IAP ==========
async function fetchWithIapToken(endpoint, payload, sendResponse) {
  const { idToken, tokenTimestamp } = await getCachedToken();
  const currentTime = Math.floor(Date.now() / 1000);

  if (idToken && tokenTimestamp && (currentTime < tokenTimestamp - TOKEN_EXPIRY_BUFFER)) {
    sendRequestWithToken(idToken, endpoint, payload, sendResponse);
  } else {
    getIapIdentityTokenViaWebAuth((newToken) => {
      if (!newToken) {
        sendResponse({ success: false, error: "Failed to get ID token" });
        return;
      }
      sendRequestWithToken(newToken, endpoint, payload, sendResponse);
    });
  }
}

// ========== API Request with Bearer Token ==========
function sendRequestWithToken(idToken, endpoint, payload, sendResponse, retry = true) {
  fetch(`${CLOUD_RUN_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(async (res) => {
      const raw = await res.text();

      if (raw.includes("Invalid IAP credentials") && retry) {
        clearCachedToken();
        getIapIdentityTokenViaWebAuth((newToken) => {
          if (newToken) {
            sendRequestWithToken(newToken, endpoint, payload, sendResponse, false);
          } else {
            sendResponse({ success: false, error: "Failed to refresh token" });
          }
        });
      } else {
        try {
          const data = JSON.parse(raw);
          sendResponse({ success: true, data });
        } catch (e) {
          sendResponse({ success: false, error: raw });
        }
      }
    })
    .catch((err) => {
      sendResponse({ success: false, error: err.message });
    });
}

// ========== Message Listener ==========
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const payload = { url: request.targetUrl };

  switch (request.action) {
    case "fetchCompetitivePrices":
      fetchWithIapToken("getProductData", payload, sendResponse);
      return true;
    case "fetchCRPPrices":
      fetchWithIapToken("getCRPPrices", payload, sendResponse);
      return true;
    case "fetchPriceHistory":
      fetchWithIapToken("getPriceHistorySales", payload, sendResponse);
      return true;
    case "triggerLogin":
      getIapIdentityTokenViaWebAuth((token) => {
        sendResponse({ success: !!token });
      });
      return true;
    default:
      sendResponse({ success: false, error: "Unknown action" });
      return false;
  }
});
