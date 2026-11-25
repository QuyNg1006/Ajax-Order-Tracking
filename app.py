from pathlib import Path
import json

from flask import Flask, jsonify

app = Flask(__name__)

# Resolve the data file relative to app.py, not the terminal directory.
ORDERS_FILE = Path(__file__).resolve().parent / 'data' / 'orders.json'


def load_orders():
    """Read the current list of orders from the JSON file."""
    with ORDERS_FILE.open('r', encoding='utf-8') as file:
        return json.load(file)


@app.get('/')
def index():
    # Temporary backend landing page. Day 2 will render Quy's template.
    return '<h1>Live Order Tracking - Backend</h1><p><a href="/api/orders">View orders API</a></p>'


@app.get('/api/orders')
def get_orders():
    # Return the array directly, as required by API_SPEC.md.
    try:
        return jsonify(load_orders())
    except (OSError, ValueError):
        app.logger.exception('Unable to read order data')
        return jsonify({'error': 'Unable to read order data'}), 500


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, threaded=True)
