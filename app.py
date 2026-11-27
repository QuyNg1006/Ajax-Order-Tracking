
from pathlib import Path
import json
import os
from datetime import datetime, timezone, timedelta
from threading import Condition
from tempfile import NamedTemporaryFile

from flask import (
    Flask,
    jsonify,
    request,
    render_template,
    render_template_string
)
from jinja2 import TemplateNotFound

app = Flask(__name__)

# Resolve the data file relative to app.py.
ORDERS_FILE = Path(__file__).resolve().parent / 'data' / 'orders.json'

# Valid order statuses.
VALID_STATUSES = {'Pending', 'Processing', 'Shipping', 'Delivered'}

# Vietnam timezone (UTC+7).
VIETNAM_TIME = timezone(timedelta(hours=7))

# A single condition protects the JSON file and in-memory revision.
condition = Condition()
version = 1


def load_orders():
    """Read all orders from the JSON file."""
    with ORDERS_FILE.open('r', encoding='utf-8') as file:
        return json.load(file)


def save_orders(orders):
    """Save orders safely using an atomic file replacement."""
    temporary = None

    try:
        with NamedTemporaryFile(
            mode='w',
            encoding='utf-8',
            dir=ORDERS_FILE.parent,
            delete=False
        ) as file:
            temporary = Path(file.name)
            json.dump(orders, file, ensure_ascii=False, indent=4)
            file.write('\n')

        os.replace(temporary, ORDERS_FILE)

    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def data_error():
    """Return a consistent error response."""
    app.logger.exception('Unable to access order data')
    return jsonify({'error': 'Unable to access order data'}), 500


@app.get('/')
def index():
    """Render the dashboard with the latest order data."""
    try:
        with condition:
            orders = load_orders()

        try:
            return render_template('index.html', orders=orders)

        except TemplateNotFound as error:
            if error.name != 'index.html':
                raise

            # Backend preview if the frontend template is unavailable.
            return render_template_string("""
                <!doctype html>
                <html lang="en">
                <head>
                    <title>Backend Preview</title>
                </head>
                <body>
                    <h1>Live Order Tracking - Backend Preview</h1>
                    <p><a href="/api/orders">View orders API</a></p>

                    <table border="1">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Customer</th>
                                <th>Status</th>
                                <th>Updated At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {% for order in orders %}
                            <tr>
                                <td>{{ order.id }}</td>
                                <td>{{ order.customer }}</td>
                                <td>{{ order.status }}</td>
                                <td>{{ order.updated_at }}</td>
                            </tr>
                            {% endfor %}
                        </tbody>
                    </table>
                </body>
                </html>
            """, orders=orders)

    except (OSError, ValueError):
        return data_error()


@app.get('/api/orders')
def get_orders():
    """Return the current list of orders."""
    try:
        with condition:
            return jsonify(load_orders())

    except (OSError, ValueError):
        return data_error()


@app.put('/api/orders/<int:order_id>')
def update_order(order_id):
    """Update an order status and notify Long Polling clients."""
    global version

    body = request.get_json(silent=True)

    if not isinstance(body, dict):
        return jsonify({'error': 'Invalid JSON'}), 400

    status = body.get('status')

    if not isinstance(status, str) or status not in VALID_STATUSES:
        return jsonify({'error': 'Invalid status'}), 400

    try:
        with condition:
            orders = load_orders()

            for order in orders:
                if order['id'] == order_id:

                    # Only notify clients when the status actually changes.
                    if order['status'] != status:
                        order['status'] = status
                        order['updated_at'] = datetime.now(
                            VIETNAM_TIME
                        ).strftime('%Y-%m-%d %H:%M:%S')

                        save_orders(orders)

                        version += 1
                        condition.notify_all()

                    return jsonify(order)

            return jsonify({'error': 'Order not found'}), 404

    except (OSError, ValueError):
        return data_error()


@app.get('/api/orders/poll')
def poll_orders():
    """Wait for order changes or return a timeout response."""
    try:
        since = int(request.args.get('since', '0'))

        if since < 0:
            raise ValueError

    except ValueError:
        return jsonify({'error': 'Invalid since'}), 400

    try:
        with condition:
            # Wait until the order revision changes or timeout occurs.
            changed = condition.wait_for(
                lambda: version != since,
                timeout=20
            )

            orders = load_orders() if changed else []

            response = jsonify({
                'changed': changed,
                'version': version,
                'orders': orders
            })

            response.headers['Cache-Control'] = 'no-store'

            return response

    except (OSError, ValueError):
        return data_error()


if __name__ == '__main__':
    app.run(
        host='127.0.0.1',
        port=5000,
        threaded=True
    )
