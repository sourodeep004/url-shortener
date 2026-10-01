const form =
    document.getElementById("urlForm");

const urlInput =
    document.getElementById("url");

const shortenButton =
    document.getElementById("shortenButton");

const result =
    document.getElementById("result");

const shortUrl =
    document.getElementById("shortUrl");

const copyButton =
    document.getElementById("copyButton");

const message =
    document.getElementById("message");

const urlTableBody =
    document.getElementById("urlTableBody");

const emptyState =
    document.getElementById("emptyState");

const totalUrls =
    document.getElementById("totalUrls");

const totalClicks =
    document.getElementById("totalClicks");

const refreshButton =
    document.getElementById("refreshButton");


// ============================================================
// SHORTEN URL
// ============================================================

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        // Hide previous message
        message.className =
            "message hidden";

        // Hide previous result
        result.classList.add("hidden");

        const url =
            urlInput.value.trim();

        // Check empty input
        if (!url) {

            showError(
                "Please enter a URL."
            );

            return;
        }

        try {

            // Disable button
            shortenButton.disabled =
                true;

            shortenButton.textContent =
                "Shortening...";


            // Send request to Flask
            const response =
                await fetch(
                    "/api/shorten",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            url: url
                        })
                    }
                );


            const data =
                await response.json();


            // Handle backend error
            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to shorten URL."
                );

            }


            // =================================================
            // DISPLAY SHORT URL
            // =================================================

            shortUrl.textContent =
                data.short_url;

            shortUrl.href =
                data.short_url;

            result.classList.remove(
                "hidden"
            );


            // =================================================
            // NEW URL OR EXISTING URL?
            // =================================================

            if (data.already_exists) {

                showExistingMessage(
                    data.message
                );

                /*
                    Keep the URL in the input
                    so the user can see what
                    they submitted.
                */

            } else {

                showSuccessMessage(
                    data.message
                );

                /*
                    Clear input only when
                    a new URL was created.
                */

                urlInput.value = "";

            }


            // Refresh URL history
            loadUrls();


        } catch (error) {

            showError(
                error.message
            );


        } finally {

            // Enable button again
            shortenButton.disabled =
                false;

            shortenButton.textContent =
                "Shorten URL";

        }

    }
);


// ============================================================
// COPY SHORT URL
// ============================================================

copyButton.addEventListener(
    "click",
    async function () {

        try {

            await navigator.clipboard.writeText(
                shortUrl.href
            );


            copyButton.textContent =
                "Copied!";


            setTimeout(
                function () {

                    copyButton.textContent =
                        "Copy";

                },
                1500
            );


        } catch (error) {

            copyButton.textContent =
                "Failed";

        }

    }
);


// ============================================================
// SHOW ERROR
// ============================================================

function showError(messageText) {

    message.textContent =
        messageText;

    message.className =
        "message error-message";

}


// ============================================================
// SHOW SUCCESS MESSAGE
// ============================================================

function showSuccessMessage(messageText) {

    message.textContent =
        messageText;

    message.className =
        "message success";

}


// ============================================================
// SHOW EXISTING URL MESSAGE
// ============================================================

function showExistingMessage(messageText) {

    message.textContent =
        messageText;

    message.className =
        "message existing";

}


// ============================================================
// LOAD URL HISTORY
// ============================================================

async function loadUrls() {

    try {

        const response =
            await fetch("/api/urls");


        if (!response.ok) {

            throw new Error(
                "Unable to load URL history."
            );

        }


        const urls =
            await response.json();


        renderUrls(urls);


    } catch (error) {

        showError(
            error.message
        );

    }

}


// ============================================================
// RENDER URL HISTORY
// ============================================================

function renderUrls(urls) {

    // Clear existing rows
    urlTableBody.innerHTML = "";


    // ========================================================
    // UPDATE STATISTICS
    // ========================================================

    totalUrls.textContent =
        urls.length;


    const clicks =
        urls.reduce(
            function (total, url) {

                return total +
                    Number(url.clicks);

            },
            0
        );


    totalClicks.textContent =
        clicks;


    // ========================================================
    // EMPTY STATE
    // ========================================================

    if (urls.length === 0) {

        emptyState.classList.remove(
            "hidden"
        );

        return;

    }


    emptyState.classList.add(
        "hidden"
    );


    // ========================================================
    // CREATE TABLE ROWS
    // ========================================================

    urls.forEach(
        function (url) {

            const row =
                document.createElement("tr");


            // ------------------------------------------------
            // Original URL
            // ------------------------------------------------

            const originalCell =
                document.createElement("td");

            originalCell.className =
                "original-url";

            originalCell.textContent =
                url.original_url;

            originalCell.title =
                url.original_url;


            // ------------------------------------------------
            // Short URL
            // ------------------------------------------------

            const shortCell =
                document.createElement("td");


            const link =
                document.createElement("a");

            link.href =
                url.short_url;

            link.textContent =
                url.short_code;

            link.target =
                "_blank";

            link.rel =
                "noopener noreferrer";


            shortCell.appendChild(
                link
            );


            // ------------------------------------------------
            // Click count
            // ------------------------------------------------

            const clicksCell =
                document.createElement("td");

            clicksCell.className =
                "click-count";

            clicksCell.textContent =
                url.clicks;


            // ------------------------------------------------
            // Add cells
            // ------------------------------------------------

            row.appendChild(
                originalCell
            );

            row.appendChild(
                shortCell
            );

            row.appendChild(
                clicksCell
            );


            // ------------------------------------------------
            // Add row to table
            // ------------------------------------------------

            urlTableBody.appendChild(
                row
            );

        }
    );

}


// ============================================================
// REFRESH BUTTON
// ============================================================

refreshButton.addEventListener(
    "click",
    function () {

        loadUrls();

    }
);


// ============================================================
// LOAD HISTORY WHEN PAGE OPENS
// ============================================================

loadUrls();