from flask import Flask, request, jsonify
from flask_cors import CORS
from google.cloud import bigquery, secretmanager
from google.oauth2 import service_account
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
import traceback, json, base64, pandas as pd, io, matplotlib.pyplot as plt, os

# Flask app
app = Flask(__name__)
CORS(app)
bq_client = None

# ---------------- Token Verification ----------------
def verify_google_identity_token(request_obj):
    auth_header = request_obj.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise Exception("Missing or invalid Authorization header")
    token = auth_header.split("Bearer ")[1]
    return id_token.verify_oauth2_token(token, google_requests.Request(), "YOUR_CLOUD_RUN_AUDIENCE")

# ---------------- BigQuery Setup ----------------
def get_service_account_from_secret(secret_name, project_id):
    client = secretmanager.SecretManagerServiceClient()
    path = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
    response = client.access_secret_version(request={"name": path})
    return json.loads(response.payload.data.decode("UTF-8"))

def init_bigquery_client():
    global bq_client
    if bq_client is not None:
        return
    credentials_dict = get_service_account_from_secret("your-secret-name", "your-project-id")
    creds = service_account.Credentials.from_service_account_info(credentials_dict)
    bq_client = bigquery.Client(credentials=creds, project=creds.project_id)

# ---------------- Utilities ----------------
def extract_product_id(url):
    from urllib.parse import urlparse, parse_qs
    parsed = urlparse(url)
    parts = parsed.path.split("/")
    if "i" in parts:
        idx = parts.index("i")
        return parts[idx + 1]
    return parse_qs(parsed.query).get("q", [None])[0]

@app.route("/")
def index():
    return "✅ Flask backend is running."

# ---------------- Route 1: Product Data ----------------
@app.route("/getProductData", methods=["POST"])
def get_product_data():
    try:
        verify_google_identity_token(request)
        init_bigquery_client()
        product_id = extract_product_id(request.json.get("url"))
        if not product_id:
            return jsonify({"error": "Missing product ID"}), 400

        query = f"""
            SELECT product_key, price 
            FROM `your_dataset` 
            WHERE product_key = '{product_id}' AND crawl_date >= CURRENT_DATE() - INTERVAL 30 DAY
        """
        df = bq_client.query(query).result().to_dataframe()
        return jsonify(df.to_dict(orient="records") or {"error": "No data found"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- Route 2: Price History + Chart ----------------
@app.route("/getPriceHistorySales", methods=["POST"])
def get_price_history_sales():
    try:
        verify_google_identity_token(request)
        init_bigquery_client()
        product_id = extract_product_id(request.json.get("url"))
        if not product_id:
            return jsonify({"error": "Missing product ID"}), 400

        # Example price + sales history query (simplified)
        query = f"""
            SELECT DATE(date) AS date, price, comp_price 
            FROM `your_dataset` WHERE product_key = '{product_id}'
        """
        df = bq_client.query(query).result().to_dataframe()
        df["date"] = pd.to_datetime(df["date"])

        # Plot price trends
        fig, ax = plt.subplots()
        df.sort_values("date", inplace=True)
        ax.plot(df["date"], df["zoro_price"], label="Zoro")
        ax.plot(df["date"], df["comp_price"], label="Competitor")
        ax.plot(df["date"], df["invoice_cost"], label="Cost")
        ax.set_title("Price Trends")
        ax.legend()

        img = io.BytesIO()
        plt.savefig(img, format="png")
        img.seek(0)
        img_base64 = base64.b64encode(img.read()).decode("utf-8")

        return jsonify({"table": df.to_dict(orient="records"), "price_chart": img_base64})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- Route 3: CRP Prices ----------------
@app.route("/getotherPrices", methods=["POST"])
def get_crp_prices():
    try:
        verify_google_identity_token(request)
        init_bigquery_client()
        product_id = extract_product_id(request.json.get("url"))
        if not product_id:
            return jsonify({"error": "Missing product ID"}), 400

        query = f"""
            SELECT * FROM `your_dataset` 
            WHERE product_key = '{product_id}'
        """
        df = bq_client.query(query).result().to_dataframe()
        return jsonify(df.to_dict(orient="records") or {"error": "No data found"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
