
// Wait until the HTML document has been loaded.
document.addEventListener("DOMContentLoaded", function () {

    // Get the buttons from the HTML document.
    const btnReload = document.getElementById("btn-reload");
    const btnFetch = document.getElementById("btn-fetch");
    const btnPolling = document.getElementById("btn-polling");
    const btnRefresh = document.getElementById("btn-refresh");

    // Get the connection information elements.
    const currentMethod = document.getElementById("current-method");
    const lastUpdated = document.getElementById("last-updated");
    const connectionStatus = document.getElementById("connection-status");

    // Default update method.
    let selectedMethod = "reload";

    // Display the time when the page finishes loading.
    lastUpdated.textContent = new Date().toLocaleString();

    // Select Full-Page Reload.
    btnReload.addEventListener("click", function () {

        selectedMethod = "reload";

        // Highlight the selected button.
        btnReload.classList.remove("btn-outline-primary");
        btnReload.classList.add("btn-primary");

        btnFetch.classList.remove("btn-primary");
        btnFetch.classList.add("btn-outline-primary");

        btnPolling.classList.remove("btn-primary");
        btnPolling.classList.add("btn-outline-primary");

        // Update connection information.
        currentMethod.textContent = "Full-Page Reload";
        connectionStatus.textContent = "Ready";

    });

    // Refresh order data.
    btnRefresh.addEventListener("click", function () {

        if (selectedMethod === "reload") {

            // Reload the entire web page.
            window.location.reload();

        }

    });

});
