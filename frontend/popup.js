// Get current tab's URL
function getCurrentTabUrl(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const url = tabs[0]?.url;
    callback(url);
  });
}

// Send message to background for API call
function sendRequest(action, url) {
  showSpinner(true);
  chrome.runtime.sendMessage({ action, targetUrl: url }, (response) => {
    showSpinner(false);
    const outputDiv = document.getElementById("output");
    outputDiv.innerHTML = ""; // Clear previous results

    if (response?.success) {
      const data = response.data;
      console.log(`[${action}] Response:`, data);

      if (action === "fetchPriceHistory") {
        const hasTableData = Array.isArray(data?.table) && data.table.length > 0;
        if (data?.price_chart) displayGraph(data.price_chart, "graphImage1");
        if (data?.gp_chart) displayGraph(data.gp_chart, "graphImage2");
        if (!hasTableData && !data?.price_chart && !data?.gp_chart) {
          outputDiv.innerHTML += `<p>⚠️ No usable data found.</p>`;
        }
      } else if (action === "fetchCRPPrices" || action === "fetchCompetitivePrices") {
        if (Array.isArray(data)) displayTable(data, action === "fetchCRPPrices" ? "CRP Prices" : "Competitive Prices");
      } else if (data?.error === "No data found") {
        outputDiv.innerHTML = "<p>No data found.</p>";
      } else {
        outputDiv.innerHTML = `<p>❌ Unexpected response:</p><pre>${JSON.stringify(data, null, 2)}</pre>`;
      }
    } else {
      outputDiv.innerHTML = `<p>❌ Error: ${response?.error || "Unknown error"}</p>`;
    }
  });
}

function fetchCRPPrices() {
  getCurrentTabUrl((url) => {
    if (url) sendRequest("fetchCRPPrices", url);
  });
}

function fetchCompetitivePrices() {
  getCurrentTabUrl((url) => {
    if (url) sendRequest("fetchCompetitivePrices", url);
  });
}

function fetchPriceHistory() {
  getCurrentTabUrl((url) => {
    if (url) sendRequest("fetchPriceHistory", url);
  });
}

// Display table output
function displayTable(data, title) {
  const outputDiv = document.getElementById("output");
  outputDiv.innerHTML += `<h4>${title}</h4>`;

  if (!Array.isArray(data) || data.length === 0) {
    outputDiv.innerHTML += "<p>⚠️ No usable table data.</p>";
    return;
  }

  let tableHTML = `
    <div style="overflow-x: auto;">
      <table style="border-collapse: collapse; font-size: 12px; min-width: 700px; border: 1px solid #ccc;">
        <thead><tr>`;

  for (let key in data[0]) {
    tableHTML += `<th style="border: 1px solid #ccc; padding: 4px; text-align: left;">${key}</th>`;
  }

  tableHTML += "</tr></thead><tbody>";

  data.forEach((row) => {
    tableHTML += "<tr>";
    for (let key in row) {
      let cell = row[key];
      if (cell === null || cell === undefined || Number.isNaN(cell)) cell = "";
      tableHTML += `<td style="border: 1px solid #ccc; padding: 4px;">${cell}</td>`;
    }
    tableHTML += "</tr>";
  });

  tableHTML += "</tbody></table></div>";
  outputDiv.innerHTML += tableHTML;
}

// Display chart image
function displayGraph(base64Image, imgId) {
  const img = document.getElementById(imgId);
  const modal = document.getElementById("graphModal");
  const modalImg = document.getElementById("modalImage");

  if (img && base64Image) {
    const base64Src = "data:image/png;base64," + base64Image;
    img.src = base64Src;
    img.style.display = "block";
    img.replaceWith(img.cloneNode(true)); // Remove old listeners
    const newImg = document.getElementById(imgId);
    newImg.addEventListener("click", () => {
      modalImg.src = base64Src;
      modal.style.display = "block";
    });
  }
}

// Spinner toggle
function showSpinner(show) {
  document.getElementById("spinner").style.display = show ? "block" : "none";
}

// Clear chart images and hide sub-tabs
function clearGraphs() {
  document.getElementById("graphImage1").src = "";
  document.getElementById("graphImage2").src = "";
  document.getElementById("priceTab").classList.remove("active");
  document.getElementById("gpTab").classList.remove("active");
  document.getElementById("performanceSubTabs").style.display = "none";
}

// Init event listeners on DOM load
document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".popup-container");
  const subTabs = document.getElementById("performanceSubTabs");
  const tabButtons = document.querySelectorAll(".sub-tab-button");
  const tabContents = document.querySelectorAll(".sub-tab-content");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });

  document.getElementById("historyBtn")?.addEventListener("click", () => {
    subTabs.style.display = "flex";
    container.style.width = "600px";
    container.style.height = "450px";
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));
    document.getElementById("priceTab").classList.add("active");
    document.querySelector('[data-tab="priceTab"]').classList.add("active");
    fetchPriceHistory();
  });

  document.getElementById("competitiveBtn")?.addEventListener("click", () => {
    clearGraphs();
    subTabs.style.display = "none";
    container.style.width = "360px";
    container.style.height = "auto";
    fetchCompetitivePrices();
  });

  document.getElementById("crpBtn")?.addEventListener("click", () => {
    clearGraphs();
    subTabs.style.display = "none";
    container.style.width = "360px";
    container.style.height = "auto";
    fetchCRPPrices();
  });

  const modal = document.getElementById("graphModal");
  const closeBtn = document.querySelector(".modal .close");

  closeBtn.onclick = () => {
    modal.style.display = "none";
  };

  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
});
