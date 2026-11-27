"""Copy into repository root temporarily; run python test_day02.py.
Tests use a temporary copy of the seed, never modify actual orders.json.
"""
import json
import tempfile
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import app as backend

with tempfile.TemporaryDirectory() as directory:
    seed = backend.load_orders()
    backend.ORDERS_FILE = Path(directory) / 'orders.json'
    backend.ORDERS_FILE.write_text(json.dumps(seed), encoding='utf-8')
    backend.version = 1
    client = backend.app.test_client()
    assert client.get('/').status_code == 200
    assert client.get('/api/orders').json == seed
    print('PASS: GET / and list API')
    assert client.put('/api/orders/1', json={'status':'Wrong'}).status_code == 400
    assert client.put('/api/orders/1', json={'status':[]}).status_code == 400
    assert client.put('/api/orders/1', data='{', content_type='application/json').status_code == 400
    assert client.put('/api/orders/99999', json={'status':'Shipping'}).status_code == 404
    print('PASS: invalid JSON/status and missing order')
    assert client.get('/api/orders/poll?since=-1').status_code == 400
    assert client.get('/api/orders/poll?since=abc').status_code == 400
    first = client.get('/api/orders/poll?since=0').json
    assert first == {'changed':True,'version':1,'orders':seed}
    assert client.get('/api/orders/poll?since=99').json == first
    print('PASS: initial snapshot, invalid revision and revision reset')
    old = seed[0]
    assert client.put(f"/api/orders/{old['id']}",json={'status':old['status']}).json == old
    assert backend.version == 1
    new_status = 'Shipping' if old['status'] != 'Shipping' else 'Delivered'
    def poll():
        with backend.app.test_client() as waiter:
            return waiter.get('/api/orders/poll?since=1').json
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(poll)
        time.sleep(0.5)
        assert not future.done(), 'Poll returned prematurely'
        response = client.put(f"/api/orders/{old['id']}", json={'status':new_status})
        assert response.status_code == 200
        assert response.json['status'] == new_status
        assert backend.load_orders()[0] == response.json
        result = future.result(timeout=5)
        assert result['changed'] and result['version'] == 2
        assert result['orders'][0] == response.json
    print('PASS: no-op revision, PUT persistence, concurrent polling wake-up')
    start = time.monotonic()
    result = client.get('/api/orders/poll?since=2').json
    elapsed = time.monotonic() - start
    assert result == {'changed':False,'version':2,'orders':[]}
    assert 19 <= elapsed <= 25, elapsed
    print(f'PASS: timeout after {elapsed:.2f} seconds')
print('All checks passed; actual orders.json unchanged.')
