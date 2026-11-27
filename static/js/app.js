
// Wait until the HTML document has been loaded.
document.addEventListener("DOMContentLoaded", function () {

    // ==========================================
    // 1. HTML ELEMENTS
    // ==========================================

    const btnReload = document.getElementById("btn-reload");
    const btnFetch = document.getElementById("btn-fetch");
    const btnPolling = document.getElementById("btn-polling");
    const btnRefresh = document.getElementById("btn-refresh");

    const orderTableBody = document.getElementById("order-table-body");

    const currentMethod = document.getElementById("current-method");
    const lastUpdated = document.getElementById("last-updated");
    const connectionStatus = document.getElementById("connection-status");

    const loadingMessage = document.getElementById("loading-message");
    const errorMessage = document.getElementById("error-message");


    // ==========================================
    // 2. APPLICATION STATE
    // ==========================================

    let selectedMethod = "reload";

    lastUpdated.textContent = new Date().toLocaleString();


    // ==========================================
    // 3. CONNECTION STATUS
    // ==========================================

    function updateConnectionStatus(message, type) {

        connectionStatus.textContent = message;

        connectionStatus.classList.remove(
            "text-success",
            "text-danger",
            "text-warning"
        );

        connectionStatus.classList.add("text-" + type);
    }


    // ==========================================
    // 4. STOP LONG POLLING
    // ==========================================

    function stopPolling() {

        if (window.OrderPolling &&
            window.OrderPolling.isRunning()) {

            window.OrderPolling.stop();

        }
    }


    // ==========================================
    // 5. SELECT UPDATE METHOD
    // ==========================================

    function selectMethod(method) {

        selectedMethod = method;

        // Stop Long Polling when switching to another method.
        if (method !== "polling") {
            stopPolling();
        }

        // Reset all button styles.
        [btnReload, btnFetch, btnPolling].forEach(function (button) {

            button.classList.remove("btn-primary");
            button.classList.add("btn-outline-primary");

        });

        // Highlight the selected method.
        if (method === "reload") {

            btnReload.classList.remove("btn-outline-primary");
            btnReload.classList.add("btn-primary");

            currentMethod.textContent = "Full-Page Reload";

        }

        else if (method === "fetch") {

            btnFetch.classList.remove("btn-outline-primary");
            btnFetch.classList.add("btn-primary");

            currentMethod.textContent = "AJAX Fetch";

        }

        else if (method === "polling") {

            btnPolling.classList.remove("btn-outline-primary");
            btnPolling.classList.add("btn-primary");

            currentMethod.textContent = "Long Polling";

        }

        // Hide previous error messages.
        errorMessage.classList.add("d-none");

        loadingMessage.classList.add("d-none");

        updateConnectionStatus("Ready", "success");
    }


    // ==========================================
    // 6. ORDER STATUS COLOR
    // ==========================================

    function getStatusClass(status) {

        switch (status) {

            case "Pending":
                return "text-bg-warning";

            case "Processing":
                return "text-bg-primary";

            case "Shipping":
                return "text-bg-info";

            case "Delivered":
                return "text-bg-success";

            default:
                return "text-bg-secondary";

        }
    }


    // ==========================================
    // 7. UPDATE ORDER TABLE
    // ==========================================

    function renderOrders(orders) {

        const fragment = document.createDocumentFragment();

        // Handle empty order data.
        if (orders.length === 0) {

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 4;
            cell.className = "text-center text-muted";
            cell.textContent = "No orders found.";

            row.appendChild(cell);
            fragment.appendChild(row);

        }

        else {

            orders.forEach(function (order) {

                const row = document.createElement("tr");

                // Order ID.
                const idCell = document.createElement("td");
                idCell.textContent = order.id;

                // Customer.
                const customerCell = document.createElement("td");
                customerCell.textContent = order.customer;

                // Status.
                const statusCell = document.createElement("td");
                const statusBadge = document.createElement("span");

                statusBadge.className =
                    "badge " + getStatusClass(order.status);

                statusBadge.textContent = order.status;

                statusCell.appendChild(statusBadge);

                // Updated time.
                const timeCell = document.createElement("td");
                timeCell.textContent = order.updated_at;

                row.appendChild(idCell);
                row.appendChild(customerCell);
                row.appendChild(statusCell);
                row.appendChild(timeCell);

                fragment.appendChild(row);

            });

        }

        // Update only the table body.
        orderTableBody.replaceChildren(fragment);
    }


    // ==========================================
    // 8. AJAX FETCH
    // ==========================================

    async function fetchOrders() {

        // Make sure Long Polling is stopped.
        stopPolling();

        loadingMessage.textContent = "Loading orders...";
        loadingMessage.classList.remove("d-none");

        errorMessage.classList.add("d-none");

        btnRefresh.disabled = true;
        btnReload.disabled = true;
        btnFetch.disabled = true;
        btnPolling.disabled = true;

        updateConnectionStatus("Loading...", "warning");

        try {

            // Send asynchronous GET request.
            const response = await fetch("/api/orders", {
                method: "GET",
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("HTTP error: " + response.status);
            }

            const orders = await response.json();

            if (!Array.isArray(orders)) {
                throw new Error("Invalid order data");
            }

            // Render the latest orders.
            renderOrders(orders);

            lastUpdated.textContent =
                new Date().toLocaleString();

            updateConnectionStatus("Connected", "success");

        }

        catch (error) {

            errorMessage.textContent =
                "Unable to load orders. " + error.message;

            errorMessage.classList.remove("d-none");

            updateConnectionStatus("Error", "danger");

            console.error("AJAX Fetch error:", error);

        }

        finally {

            loadingMessage.classList.add("d-none");

            btnRefresh.disabled = false;
            btnReload.disabled = false;
            btnFetch.disabled = false;
            btnPolling.disabled = false;

        }
    }


    // ==========================================
    // 9. LONG POLLING
    // ==========================================

    function startPolling() {

        // Check whether the Long Polling library is loaded.
        if (!window.OrderPolling) {

            errorMessage.textContent =
                "Long Polling script is not loaded.";

            errorMessage.classList.remove("d-none");

            updateConnectionStatus("Error", "danger");

            console.error("OrderPolling is not available.");

            return;
        }

        // Stop an existing polling session before starting another.
        stopPolling();

        loadingMessage.classList.add("d-none");
        errorMessage.classList.add("d-none");

        updateConnectionStatus("Connecting...", "warning");

        // Start continuous Long Polling.
        window.OrderPolling.start(

            // Callback 1: Receive new orders.
            function (orders) {

                renderOrders(orders);

                lastUpdated.textContent =
                    new Date().toLocaleString();

                errorMessage.classList.add("d-none");

            },

            // Callback 2: Handle connection states.
            function (state) {

                switch (state) {

                    case "waiting":

                        updateConnectionStatus(
                            "Waiting for updates...",
                            "warning"
                        );

                        break;

                    case "updated":

                        updateConnectionStatus(
                            "Data updated",
                            "success"
                        );

                        break;

                    case "timeout":

                        updateConnectionStatus(
                            "Connected - No changes",
                            "success"
                        );

                        break;

                    case "error":

                        updateConnectionStatus(
                            "Connection error",
                            "danger"
                        );

                        break;

                }

            },

            // Callback 3: Handle errors.
            function (error) {

                errorMessage.textContent =
                    "Long Polling error: " + error.message;

                errorMessage.classList.remove("d-none");

                console.error("Long Polling error:", error);

            }

        );
    }


    // ==========================================
    // 10. BUTTON EVENTS
    // ==========================================

    // Full-Page Reload.
    btnReload.addEventListener("click", function () {

        selectMethod("reload");

    });


    // AJAX Fetch.
    btnFetch.addEventListener("click", function () {

        selectMethod("fetch");

    });


    // Long Polling.
    btnPolling.addEventListener("click", function () {

        selectMethod("polling");

        // Long Polling starts immediately when selected.
        startPolling();

    });


    // Refresh Orders.
    btnRefresh.addEventListener("click", function () {

        if (selectedMethod === "reload") {

            // Reload the entire page.
            window.location.reload();

        }

        else if (selectedMethod === "fetch") {

            // Update the table using AJAX Fetch.
            fetchOrders();

        }

        else if (selectedMethod === "polling") {

            // Restart Long Polling.
            startPolling();

        }

    });


    // ==========================================
    // 11. INITIALIZATION
    // ==========================================

    updateConnectionStatus("Ready", "success");

});
