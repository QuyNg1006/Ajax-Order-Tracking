
// Wait until the HTML document has been loaded.
document.addEventListener("DOMContentLoaded", function () {

    // HTML Elements

    // Get the update method buttons.
    const btnReload = document.getElementById("btn-reload");
    const btnFetch = document.getElementById("btn-fetch");
    const btnPolling = document.getElementById("btn-polling");
    const btnRefresh = document.getElementById("btn-refresh");

    // Get the order table.
    const orderTableBody = document.getElementById("order-table-body");

    // Get the connection information elements.
    const currentMethod = document.getElementById("current-method");
    const lastUpdated = document.getElementById("last-updated");
    const connectionStatus = document.getElementById("connection-status");

    // Get loading and error messages.
    const loadingMessage = document.getElementById("loading-message");
    const errorMessage = document.getElementById("error-message");

    // Default update method.
    let selectedMethod = "reload";

    // Display the initial page loading time.
    lastUpdated.textContent = new Date().toLocaleString();


    // Select Update Method

    function selectMethod(method) {

        selectedMethod = method;

        // Reset all button styles.
        [btnReload, btnFetch, btnPolling].forEach(function (button) {

            button.classList.remove("btn-primary");
            button.classList.add("btn-outline-primary");

        });

        // Highlight Full-Page Reload.
        if (method === "reload") {

            btnReload.classList.remove("btn-outline-primary");
            btnReload.classList.add("btn-primary");

            currentMethod.textContent = "Full-Page Reload";

        }

        // Highlight AJAX Fetch.
        else if (method === "fetch") {

            btnFetch.classList.remove("btn-outline-primary");
            btnFetch.classList.add("btn-primary");

            currentMethod.textContent = "AJAX Fetch";

        }

        // Reset previous error messages.
        errorMessage.classList.add("d-none");

        updateConnectionStatus("Ready", "success");

    }


    // Connection Status

    function updateConnectionStatus(message, type) {

        connectionStatus.textContent = message;

        connectionStatus.classList.remove(
            "text-success",
            "text-danger",
            "text-warning"
        );

        connectionStatus.classList.add("text-" + type);

    }


    // Order Status Color

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


    // Update Order Table

    function renderOrders(orders) {

        // Create new table content without reloading the page.
        const fragment = document.createDocumentFragment();

        // Handle an empty order list.
        if (orders.length === 0) {

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 4;
            cell.className = "text-center text-muted";
            cell.textContent = "No orders found.";

            row.appendChild(cell);
            fragment.appendChild(row);

        } else {

            // Create a table row for each order.
            orders.forEach(function (order) {

                const row = document.createElement("tr");

                // Order ID.
                const idCell = document.createElement("td");
                idCell.textContent = order.id;

                // Customer name.
                const customerCell = document.createElement("td");
                customerCell.textContent = order.customer;

                // Order status.
                const statusCell = document.createElement("td");
                const statusBadge = document.createElement("span");

                statusBadge.className =
                    "badge " + getStatusClass(order.status);

                statusBadge.textContent = order.status;

                statusCell.appendChild(statusBadge);

                // Last update time.
                const timeCell = document.createElement("td");
                timeCell.textContent = order.updated_at;

                // Add all cells to the row.
                row.appendChild(idCell);
                row.appendChild(customerCell);
                row.appendChild(statusCell);
                row.appendChild(timeCell);

                fragment.appendChild(row);

            });

        }

        // Replace only the table body.
        orderTableBody.replaceChildren(fragment);

    }


    // AJAX Fetch

    async function fetchOrders() {

        // Show loading message.
        loadingMessage.classList.remove("d-none");

        // Hide previous error messages.
        errorMessage.classList.add("d-none");

        // Prevent multiple requests while loading.
        btnRefresh.disabled = true;
        btnReload.disabled = true;
        btnFetch.disabled = true;
        btnPolling.disabled = true;

        updateConnectionStatus("Loading...", "warning");

        try {

            // Send an asynchronous GET request to Flask.
            const response = await fetch("/api/orders", {
                method: "GET",
                cache: "no-store"
            });

            // Check HTTP response status.
            if (!response.ok) {

                throw new Error("HTTP error: " + response.status);

            }

            // Convert the JSON response to JavaScript data.
            const orders = await response.json();

            // Verify the response format.
            if (!Array.isArray(orders)) {

                throw new Error("Invalid order data");

            }

            // Update only the order table.
            renderOrders(orders);

            // Update the last successful refresh time.
            lastUpdated.textContent = new Date().toLocaleString();

            // Display successful connection status.
            updateConnectionStatus("Connected", "success");

        } catch (error) {

            // Display error information.
            errorMessage.textContent =
                "Unable to load orders. " + error.message;

            errorMessage.classList.remove("d-none");

            updateConnectionStatus("Error", "danger");

            console.error("AJAX Fetch error:", error);

        } finally {

            // Hide loading message after the request finishes.
            loadingMessage.classList.add("d-none");

            // Enable the buttons again.
            btnRefresh.disabled = false;
            btnReload.disabled = false;
            btnFetch.disabled = false;
            btnPolling.disabled = false;

        }

    }


    // Button Events

    // Select Full-Page Reload.
    btnReload.addEventListener("click", function () {

        selectMethod("reload");

    });


    // Select AJAX Fetch.
    btnFetch.addEventListener("click", function () {

        selectMethod("fetch");

    });


    // Refresh orders using the selected method.
    btnRefresh.addEventListener("click", function () {

        if (selectedMethod === "reload") {

            // Reload the entire web page.
            window.location.reload();

        } else if (selectedMethod === "fetch") {

            // Update orders without reloading the page.
            fetchOrders();

        }

    });

    // Long Polling will be integrated on Day 3.

});
