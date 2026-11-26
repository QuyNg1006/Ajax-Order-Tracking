/* Independent polling client. Load before app.js; no DOM ownership. */
(function () {
    let active = null;

    function stop() {
        if (!active) return;
        const session = active;
        active = null;
        session.controller.abort(); // Abort the pending fetch or retry delay.
    }

    function delay(ms, signal) {
        return new Promise(resolve => {
            if (signal.aborted) { resolve(); return; }
            const finish = () => {
                clearTimeout(timer);
                signal.removeEventListener('abort', finish);
                resolve();
            };
            const timer = setTimeout(finish, ms);
            signal.addEventListener('abort', finish, { once: true });
        });
    }

    async function run(session, onOrders, onState, onError) {
        const signal = session.controller.signal;
        let since = 0;
        while (active === session && !signal.aborted) {
            try {
                onState('waiting');
                const response = await fetch(`/api/orders/poll?since=${since}`, {
                    signal, cache: 'no-store'
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (active !== session || signal.aborted) return;
                if (!Number.isInteger(data.version) || data.version < 1 ||
                    typeof data.changed !== 'boolean' || !Array.isArray(data.orders)) {
                    throw new Error('Invalid polling response');
                }
                // On timeout keep existing rows; only render changed snapshots.
                if (data.changed) onOrders(data.orders);
                since = data.version;
                onState(data.changed ? 'updated' : 'timeout');
            } catch (error) {
                if (active !== session || signal.aborted) return;
                // Reset revision after an observed connection failure.
                since = 0;
                onState('error');
                onError(error);
                await delay(1000, signal); // Avoid a tight retry loop.
            }
        }
    }

    function start(onOrders, onState = () => {}, onError = () => {}) {
        if (typeof onOrders !== 'function') throw new TypeError('onOrders must be a function');
        stop();
        const session = { controller: new AbortController() };
        active = session;
        run(session, onOrders, onState, onError).catch(error => {
            if (active === session) { stop(); console.error(error); }
        });
    }

    window.OrderPolling = { start, stop, isRunning: () => active !== null };
})();
