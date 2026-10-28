"use strict";

/* =========================================================
   ALI GEMORA — APP.JS
   ========================================================= */


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const money = (value) =>
    `Rs. ${Number(value || 0).toLocaleString("en-PK")}`;

const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);

// The backend catalogue historically returns /images/images/<file> because
// its full-project deployment mounted the frontend directory at /images.
// On Vercel, the same files live at /images/<file> in this frontend project.
// Normalize that legacy prefix without changing backend data.
const assetUrl = (value) => {
    const raw = String(value ?? "").trim();
    if (raw.startsWith("/images/images/")) {
        return `/images/${raw.slice("/images/images/".length)}`;
    }
    return raw;
};

const ORDER_ENQUIRY_WHATSAPP_NUMBER = "923241227746";


const api = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
};


/* =========================================================
   STATE
   ========================================================= */

let catalog = [];

let cart = [];

try {
    cart = JSON.parse(
        localStorage.getItem("ali-gemora-cart") || "[]"
    );
} catch {
    cart = [];
}


/* =========================================================
   CINEMATIC INTRO
   ========================================================= */

function startIntro() {

    const intro = $("#cinematic-intro");
    const particles = $("#intro-particles");
    const skip = $("#intro-skip");

    if (!intro) return;


    const introKey = "ali-gemora-intro-seen";


    if (sessionStorage.getItem(introKey)) {
        intro.remove();
        return;
    }


    /* Create golden particles */

    if (particles) {

        const amount =
            window.innerWidth <= 650 ? 45 : 90;

        for (let i = 0; i < amount; i++) {

            const particle =
                document.createElement("span");

            particle.className =
                "intro-particle";


            const angle =
                Math.random() * Math.PI * 2;

            const distance =
                180 + Math.random() * 420;


            const startX =
                window.innerWidth / 2 +
                Math.cos(angle) * distance;

            const startY =
                window.innerHeight / 2 +
                Math.sin(angle) * distance;


            particle.style.left =
                `${startX}px`;

            particle.style.top =
                `${startY}px`;


            particle.animate(
                [
                    {
                        opacity: 0,
                        transform: "scale(.2)"
                    },
                    {
                        opacity: 1,
                        transform: "scale(1)"
                    },
                    {
                        opacity: 0.15,
                        left:
                            `${window.innerWidth / 2}px`,
                        top:
                            `${window.innerHeight / 2}px`,
                        transform: "scale(.1)"
                    }
                ],
                {
                    duration:
                        (1.7 + Math.random() * 1.7) * 1000,

                    delay:
                        Math.random() * 1700,

                    easing:
                        "cubic-bezier(.16,.8,.25,1)",

                    fill: "forwards"
                }
            );
        }
    }


    let closed = false;


    const closeIntro = () => {

        if (closed) return;

        closed = true;

        sessionStorage.setItem(
            introKey,
            "1"
        );

        intro.classList.add("exit");


        setTimeout(() => {

            if (intro) {
                intro.remove();
            }

        }, 1500);
    };


    if (skip) {
        skip.addEventListener(
            "click",
            closeIntro
        );
    }


    setTimeout(
        closeIntro,
        8200
    );
}


/* =========================================================
   PRODUCT RENDER
   ========================================================= */

function renderProducts(products) {

    const grid = $("#product-grid");

    const count = $("#result-count");

    if (!grid) return;


    if (count) {
        count.textContent =
            `${products.length} gemstones`;
    }


    if (!products.length) {

        grid.innerHTML = `
            <div class="empty-results">
                <p>No gemstones matched your search.</p>
            </div>
        `;

        return;
    }


    grid.innerHTML = products.map((item) => `

        <article class="product-card">

            <button
                class="wishlist"
                type="button"
                aria-label="Add to wishlist"
            >
                ♡
            </button>


            <div class="product-image">

                ${String(item.image || "").toLowerCase().endsWith(".mp4")
                    ? `<video controls preload="metadata" aria-label="${escapeHtml(item.name || "Certificate")}"><source src="${escapeHtml(assetUrl(item.image))}" type="video/mp4"></video>`
                    : `<img src="${escapeHtml(assetUrl(item.image))}" alt="${escapeHtml(item.name || "Gemstone")}" loading="lazy">`}

                ${
                    item.discount
                        ? `
                            <span class="sale-badge">
                                ${escapeHtml(item.discount)}% OFF
                            </span>
                          `
                        : ""
                }

            </div>


            <div class="product-info">

                <p class="product-category">
                    ${escapeHtml(item.category || "Gemstone")}
                    ·
                    ${escapeHtml(item.natural_status || "")}
                </p>


                <h3>
                    ${escapeHtml(item.name || "Gemstone")}
                </h3>


                <p class="product-meta">
                    ${escapeHtml(item.weight || "")}
                    ·
                    ${escapeHtml(item.color || "")}
                </p>


                <div class="price-row">

                    <strong>
                        ${money(item.price)}
                    </strong>

                    ${
                        item.old_price
                            ? `
                                <del>
                                    ${money(item.old_price)}
                                </del>
                              `
                            : ""
                    }

                </div>


                <div class="card-actions">

                    <button
                        class="details-button"
                        type="button"
                        data-detail="${escapeHtml(item.id)}"
                    >
                        View details
                    </button>


                    <button
                        class="buy-button"
                        type="button"
                        data-buy="${escapeHtml(item.id)}"
                    >
                        Buy now
                    </button>

                </div>

            </div>

        </article>

    `).join("");
}


/* =========================================================
   FILTER PRODUCTS
   ========================================================= */

function getFilteredProducts() {

    let products = [...catalog];


    const search =
        ($("#search-input")?.value || "")
            .trim()
            .toLowerCase();


    const category =
        $("#category-filter")?.value || "all";


    const stock =
        $("#stock-filter")?.value || "all";


    const sort =
        $("#sort-products")?.value || "price-low";


    if (search) {

        products = products.filter((item) => {

            const text = `
                ${item.name || ""}
                ${item.category || ""}
                ${item.description || ""}
                ${item.color || ""}
                ${item.origin || ""}
            `.toLowerCase();

            return text.includes(search);
        });
    }


    if (category !== "all") {

        products = products.filter(
            (item) =>
                String(item.category || "")
                    .toLowerCase() ===
                category.toLowerCase()
        );
    }


    if (stock === "in-stock") {

        products = products.filter(
            (item) =>
                Number(item.stock || 0) > 0
        );
    }


    if (sort === "price-low") {

        products.sort(
            (a, b) =>
                Number(a.price || 0) -
                Number(b.price || 0)
        );
    }


    if (sort === "price-high") {

        products.sort(
            (a, b) =>
                Number(b.price || 0) -
                Number(a.price || 0)
        );
    }


    if (sort === "name") {

        products.sort(
            (a, b) =>
                String(a.name || "")
                    .localeCompare(
                        String(b.name || "")
                    )
        );
    }


    return products;
}


function refreshProducts() {

    renderProducts(
        getFilteredProducts()
    );
}


/* =========================================================
   ZODIAC DATA
   ========================================================= */

const zodiacData = [

    {
        sign: "Aries",
        dates: "March 21 – April 19",
        icon: "♈",
        primary: "Ruby",
        alternative: "Carnelian"
    },

    {
        sign: "Taurus",
        dates: "April 20 – May 20",
        icon: "♉",
        primary: "Emerald",
        alternative: "Rose Quartz"
    },

    {
        sign: "Gemini",
        dates: "May 21 – June 20",
        icon: "♊",
        primary: "Aqeeq",
        alternative: "Citrine"
    },

    {
        sign: "Cancer",
        dates: "June 21 – July 22",
        icon: "♋",
        primary: "Pearl",
        alternative: "Moonstone"
    },

    {
        sign: "Leo",
        dates: "July 23 – August 22",
        icon: "♌",
        primary: "Ruby",
        alternative: "Citrine · Peridot"
    },

    {
        sign: "Virgo",
        dates: "August 23 – September 22",
        icon: "♍",
        primary: "Peridot",
        alternative: "Sapphire"
    },

    {
        sign: "Libra",
        dates: "September 23 – October 22",
        icon: "♎",
        primary: "Opal",
        alternative: "Rose Quartz"
    },

    {
        sign: "Scorpio",
        dates: "October 23 – November 21",
        icon: "♏",
        primary: "Topaz",
        alternative: "Garnet"
    },

    {
        sign: "Sagittarius",
        dates: "November 22 – December 21",
        icon: "♐",
        primary: "Turquoise",
        alternative: "Topaz"
    },

    {
        sign: "Capricorn",
        dates: "December 22 – January 19",
        icon: "♑",
        primary: "Garnet",
        alternative: "Onyx"
    },

    {
        sign: "Aquarius",
        dates: "January 20 – February 18",
        icon: "♒",
        primary: "Amethyst",
        alternative: "Garnet"
    },

    {
        sign: "Pisces",
        dates: "February 19 – March 20",
        icon: "♓",
        primary: "Aquamarine",
        alternative: "Amethyst"
    }

];


/* =========================================================
   ZODIAC CARDS
   ========================================================= */

function renderZodiac() {

    const grid =
        $("#zodiac-grid");

    if (!grid) return;


    grid.innerHTML =
        zodiacData.map((zodiac) => `

            <article class="zodiac-card">

                <span class="zodiac-icon">
                    ${zodiac.icon}
                </span>

                <h3>
                    ${zodiac.sign}
                </h3>

                <small>
                    ${zodiac.dates}
                </small>

                <p>

                    <strong>
                        ${zodiac.primary}
                    </strong>

                    <br>

                    Alternative:
                    ${zodiac.alternative}

                </p>


                <button
                    class="zodiac-link"
                    type="button"
                    data-category="${escapeHtml(zodiac.primary)}"
                >
                    Explore stones →
                </button>

            </article>

        `).join("");
}


/* =========================================================
   CART
   ========================================================= */

function updateCart() {

    localStorage.setItem(
        "ali-gemora-cart",
        JSON.stringify(cart)
    );


    const count =
        $(".bag-button span");


    if (count) {

        count.textContent =
            cart.reduce(
                (total, item) =>
                    total +
                    Number(item.quantity || 0),
                0
            );
    }


    const total =
        cart.reduce(
            (sum, item) =>
                sum +
                Number(item.price || 0) *
                Number(item.quantity || 0),
            0
        );


    const cartTotal =
        $("#cart-total");


    if (cartTotal) {
        cartTotal.textContent =
            money(total);
    }


    const items =
        $("#cart-items");


    if (!items) return;


    if (!cart.length) {

        items.innerHTML = `
            <p class="empty-cart">
                Your cart is ready for something beautiful.
            </p>
        `;

        return;
    }


    items.innerHTML =
        cart.map((item) => `

            <div class="cart-item">

                <img
                    src="${escapeHtml(assetUrl(item.image))}"
                    alt="${escapeHtml(item.name || "")}"
                >


                <div>

                    <strong>
                        ${escapeHtml(item.name || "Gemstone")}
                    </strong>

                    <small>
                        ${money(item.price)}
                    </small>


                    <div class="qty">

                        <button
                            type="button"
                            data-qty="${escapeHtml(item.id)}"
                            data-change="-1"
                        >
                            −
                        </button>


                        <span>
                            ${Number(item.quantity || 1)}
                        </span>


                        <button
                            type="button"
                            data-qty="${escapeHtml(item.id)}"
                            data-change="1"
                        >
                            +
                        </button>


                        <button
                            class="remove"
                            type="button"
                            data-remove="${escapeHtml(item.id)}"
                        >
                            Remove
                        </button>

                    </div>

                </div>

            </div>

        `).join("");
}


function toggleCart(open) {

    $("#cart-drawer")
        ?.classList
        .toggle("open", open);


    $("#cart-overlay")
        ?.classList
        .toggle("open", open);
}


function addToCart(product) {

    if (!product) return;


    const existing =
        cart.find(
            (item) =>
                String(item.id) ===
                String(product.id)
        );


    if (existing) {

        existing.quantity =
            Number(existing.quantity || 0) + 1;

    } else {

        cart.push({
            ...product,
            quantity: 1
        });
    }


    updateCart();

    toggleCart(true);
}


/* =========================================================
   PRODUCT DETAILS
   ========================================================= */

function openProductDetails(product) {

    const modal =
        $("#product-modal");

    const content =
        $("#product-detail");


    if (!modal || !content) return;


    content.innerHTML = `

        <button
            class="modal-close"
            type="button"
            data-close-modal
            aria-label="Close"
        >
            ×
        </button>


        <div class="detail-grid">

            <img
                src="${escapeHtml(assetUrl(product.image))}"
                alt="${escapeHtml(product.name || "")}"
            >


            <div>

                <p class="eyebrow">
                    ${escapeHtml(product.category || "Gemstone")}
                    ·
                    ${escapeHtml(product.natural_status || "")}
                </p>


                <h2>
                    ${escapeHtml(product.name || "Gemstone")}
                </h2>


                <div class="detail-price">

                    ${money(product.price)}

                    ${
                        product.old_price
                            ? `
                                <del>
                                    ${money(product.old_price)}
                                </del>
                              `
                            : ""
                    }

                </div>


                <p>
                    ${escapeHtml(
                        product.description ||
                        "A beautiful gemstone from the Ali Gemora collection."
                    )}
                </p>


                <dl>

                    <dt>Weight</dt>
                    <dd>
                        ${escapeHtml(product.weight || "—")}
                    </dd>


                    <dt>Colour</dt>
                    <dd>
                        ${escapeHtml(product.color || "—")}
                    </dd>


                    <dt>Origin</dt>
                    <dd>
                        ${escapeHtml(product.origin || "—")}
                    </dd>


                    <dt>Treatment</dt>
                    <dd>
                        ${escapeHtml(product.treatment || "—")}
                    </dd>


                    <dt>Certificate</dt>
                    <dd>
                        ${escapeHtml(product.certificate || "—")}
                    </dd>

                </dl>

                ${product.certificate_image
                    ? `
                        <button
                            class="button certificate-button"
                            type="button"
                            data-certificate="${escapeHtml(assetUrl(product.certificate_image))}"
                            data-certificate-name="${escapeHtml(product.name || "Gemstone")}"
                        >
                            View Authenticity Certificate
                        </button>
                      `
                    : ""}


                <button
                    class="button primary"
                    type="button"
                    data-modal-buy="${escapeHtml(product.id)}"
                >
                    Add to cart
                    <span>→</span>
                </button>

            </div>

        </div>
    `;


    modal.classList.add("open");
}


/* =========================================================
   ZODIAC FINDER
   ========================================================= */

function getZodiacFromDate(dateString) {

    const date =
        new Date(`${dateString}T00:00:00`);


    if (Number.isNaN(date.getTime())) {
        return null;
    }


    const month =
        date.getMonth() + 1;

    const day =
        date.getDate();


    if (
        (month === 3 && day >= 21) ||
        (month === 4 && day <= 19)
    ) return zodiacData[0];


    if (
        (month === 4 && day >= 20) ||
        (month === 5 && day <= 20)
    ) return zodiacData[1];


    if (
        (month === 5 && day >= 21) ||
        (month === 6 && day <= 20)
    ) return zodiacData[2];


    if (
        (month === 6 && day >= 21) ||
        (month === 7 && day <= 22)
    ) return zodiacData[3];


    if (
        (month === 7 && day >= 23) ||
        (month === 8 && day <= 22)
    ) return zodiacData[4];


    if (
        (month === 8 && day >= 23) ||
        (month === 9 && day <= 22)
    ) return zodiacData[5];


    if (
        (month === 9 && day >= 23) ||
        (month === 10 && day <= 22)
    ) return zodiacData[6];


    if (
        (month === 10 && day >= 23) ||
        (month === 11 && day <= 21)
    ) return zodiacData[7];


    if (
        (month === 11 && day >= 22) ||
        (month === 12 && day <= 21)
    ) return zodiacData[8];


    if (
        (month === 12 && day >= 22) ||
        (month === 1 && day <= 19)
    ) return zodiacData[9];


    if (
        (month === 1 && day >= 20) ||
        (month === 2 && day <= 18)
    ) return zodiacData[10];


    return zodiacData[11];
}


function showZodiacResult(data) {

    const result =
        $("#result");

    if (!result) return;


    const alternatives =
        Array.isArray(data.alternatives)
            ? data.alternatives.join(" · ")
            : data.alternative || "—";


    result.innerHTML = `

        <div class="recommendation-result">

            <span class="zodiac-icon">
                ${escapeHtml(data.symbol || "✦")}
            </span>


            <div>

                <p class="eyebrow">
                    ${escapeHtml(data.zodiac_sign || data.sign || "")}
                    ·
                    ${escapeHtml(data.date_range || data.dates || "")}
                </p>


                <h3>
                    ${escapeHtml(data.primary || "Gemstone")}
                </h3>


                <p>
                    Alternative stones:
                    ${escapeHtml(alternatives)}
                </p>


                <small>
                    ${escapeHtml(
                        data.notice ||
                        "Traditional zodiac-based suggestion."
                    )}
                </small>


                <button
                    class="text-link"
                    type="button"
                    data-category="${escapeHtml(data.primary || "")}"
                >
                    Explore
                    ${escapeHtml(data.primary || "stone")}
                    →
                </button>

            </div>

        </div>
    `;
}


async function recommendStone() {

    const dob =
        $("#dob")?.value;

    const result =
        $("#result");


    if (!dob) {

        $("#dob")?.focus();

        return;
    }


    if (result) {

        result.innerHTML = `
            <strong>
                Finding your traditional match…
            </strong>

            <span>
                Please wait a moment.
            </span>
        `;
    }


    try {

        const data =
            await api(
                "/api/recommend-stone",
                {
                    method: "POST",
                    body: JSON.stringify({
                        date_of_birth: dob
                    })
                }
            );


        showZodiacResult(data);

    } catch (error) {

        console.warn(
            "Backend recommendation unavailable.",
            error
        );


        const zodiac =
            getZodiacFromDate(dob);


        if (!zodiac) return;


        showZodiacResult({
            symbol: zodiac.icon,
            zodiac_sign: zodiac.sign,
            date_range: zodiac.dates,
            primary: zodiac.primary,
            alternatives:
                zodiac.alternative.split(" · "),
            notice:
                "Traditional zodiac-based suggestion."
        });
    }
}


/* =========================================================
   CHATBOT
   ========================================================= */

function addChatMessage(message, type) {

    const messages =
        $("#chat-messages");

    if (!messages) return;


    const div =
        document.createElement("div");


    div.className =
        `chat-message ${type}`;


    div.textContent =
        message;


    messages.appendChild(div);


    messages.scrollTop =
        messages.scrollHeight;
}


async function sendChatMessage(message) {

    try {

        const data =
            await api(
                "/api/chat",
                {
                    method: "POST",
                    body: JSON.stringify({
                        message
                    })
                }
            );


        return (
            data.reply ||
            data.response ||
            data.message ||
            "I couldn't find an answer for that."
        );

    } catch {

        return getLocalChatResponse(
            message
        );
    }
}


function getLocalChatResponse(message) {

    const text =
        message.toLowerCase();


    if (
        text.includes("ruby")
    ) {
        return "Ruby is a precious gemstone known for its rich red colour. In traditional zodiac associations, Ruby is commonly linked with Leo and Aries.";
    }


    if (
        text.includes("emerald")
    ) {
        return "Emerald is a green variety of beryl and is valued for its colour and clarity. It is traditionally associated with Taurus and some other zodiac traditions.";
    }


    if (
        text.includes("diamond")
    ) {
        return "Diamond is a naturally occurring carbon gemstone known for its hardness and brilliance.";
    }


    if (
        text.includes("opal")
    ) {
        return "Opal is known for its beautiful play-of-colour. It is traditionally associated with Libra in some gemstone traditions.";
    }


    if (
        text.includes("aqeeq") ||
        text.includes("agate")
    ) {
        return "Aqeeq, commonly referring to varieties of agate, is a popular traditional gemstone. Its colours can range from red and brown to black and other shades.";
    }


    if (
        text.includes("zodiac") ||
        text.includes("star")
    ) {
        return "You can use our Find Your Stone section to enter your date of birth and explore a traditional zodiac-based gemstone suggestion.";
    }


    if (
        text.includes("price") ||
        text.includes("cost")
    ) {
        return "You can browse current gemstone prices directly in the Ali Gemora collection.";
    }


    if (
        text.includes("delivery") ||
        text.includes("pakistan")
    ) {
        return "Ali Gemora is designed for gemstone delivery within Pakistan.";
    }


    return "I can help you explore gemstones, colours, prices, traditional zodiac associations and the Ali Gemora collection. Try asking about Ruby, Emerald, Opal or Aqeeq.";
}


function setupChat() {

    const toggle =
        $("#chat-toggle");

    const panel =
        $("#chat-panel");

    const close =
        $("#chat-close");

    const form =
        $("#chat-form");

    const input =
        $("#chat-input");


    if (toggle && panel) {

        toggle.addEventListener(
            "click",
            () => {
                panel.classList.toggle("open");
            }
        );
    }


    if (close && panel) {

        close.addEventListener(
            "click",
            () => {
                panel.classList.remove("open");
            }
        );
    }


    if (form && input) {

        form.addEventListener(
            "submit",
            async (event) => {

                event.preventDefault();


                const message =
                    input.value.trim();


                if (!message) return;


                addChatMessage(
                    message,
                    "user"
                );


                input.value = "";


                addChatMessage(
                    "Thinking…",
                    "bot"
                );


                const botMessage =
                    await sendChatMessage(message);


                const messages =
                    $("#chat-messages");


                const thinking =
                    messages?.lastElementChild;


                if (
                    thinking &&
                    thinking.classList.contains("bot")
                ) {

                    thinking.textContent =
                        botMessage;

                } else {

                    addChatMessage(
                        botMessage,
                        "bot"
                    );
                }
            }
        );
    }
}


/* =========================================================
   EVENT HANDLERS
   ========================================================= */

let certificateZoom = 1;

function updateCertificateZoom() {

    const image = $("#certificate-image");
    const level = $("#certificate-zoom-level");

    if (image) {
        image.style.transform = `scale(${certificateZoom})`;
    }

    if (level) {
        level.textContent = `${Math.round(certificateZoom * 100)}%`;
    }
}

function openCertificateViewer(imageUrl, gemstoneName) {

    const modal = $("#certificate-modal");
    const image = $("#certificate-image");
    const title = $("#certificate-title");

    if (!modal || !image || !imageUrl) return;

    image.src = assetUrl(imageUrl);
    image.alt = `${gemstoneName || "Gemstone"} authenticity certificate`;
    if (title) {
        title.textContent = `${gemstoneName || "Gemstone"} Authenticity Certificate`;
    }

    certificateZoom = 1;
    updateCertificateZoom();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
}

function closeCertificateViewer() {

    const modal = $("#certificate-modal");
    const image = $("#certificate-image");

    modal?.classList.remove("open");
    modal?.setAttribute("aria-hidden", "true");

    if (image) {
        image.removeAttribute("src");
        image.style.transform = "scale(1)";
    }
}

function setupEvents() {

    $("#certificate-zoom-in")
        ?.addEventListener(
            "click",
            () => {
                certificateZoom = Math.min(3, certificateZoom + 0.25);
                updateCertificateZoom();
            }
        );

    $("#certificate-zoom-out")
        ?.addEventListener(
            "click",
            () => {
                certificateZoom = Math.max(0.5, certificateZoom - 0.25);
                updateCertificateZoom();
            }
        );

    $("#certificate-zoom-reset")
        ?.addEventListener(
            "click",
            () => {
                certificateZoom = 1;
                updateCertificateZoom();
            }
        );

    $("#certificate-modal")
        ?.addEventListener(
            "click",
            (event) => {
                if (event.target === event.currentTarget) {
                    closeCertificateViewer();
                }
            }
        );

    document.addEventListener(
        "click",
        (event) => {
            const certificate = event.target.closest("[data-certificate]");

            if (certificate) {
                openCertificateViewer(
                    certificate.dataset.certificate,
                    certificate.dataset.certificateName
                );
                return;
            }

            if (event.target.closest("[data-close-certificate]")) {
                closeCertificateViewer();
            }
        }
    );

    /* Search */

    $("#store-search")
        ?.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();

                refreshProducts();

                $("#shop")
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });
            }
        );


    $("#search-input")
        ?.addEventListener(
            "input",
            refreshProducts
        );


    $("#category-filter")
        ?.addEventListener(
            "change",
            refreshProducts
        );


    $("#stock-filter")
        ?.addEventListener(
            "change",
            refreshProducts
        );


    $("#sort-products")
        ?.addEventListener(
            "change",
            refreshProducts
        );


    /* Search icon */

    $("#search-focus")
        ?.addEventListener(
            "click",
            () => {

                $("#shop")
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });

                setTimeout(() => {
                    $("#search-input")?.focus();
                }, 500);
            }
        );


    /* Cart */

    $("#open-cart")
        ?.addEventListener(
            "click",
            () => toggleCart(true)
        );


    $("#close-cart")
        ?.addEventListener(
            "click",
            () => toggleCart(false)
        );


    $("#cart-overlay")
        ?.addEventListener(
            "click",
            () => toggleCart(false)
        );


    /* Zodiac */

    $("#recommend-btn")
        ?.addEventListener(
            "click",
            recommendStone
        );


    /* Checkout */

    $("#checkout-open")
        ?.addEventListener(
            "click",
            () => {

                if (!cart.length) {

                    alert(
                        "Your cart is empty."
                    );

                    return;
                }


                $("#checkout-modal")
                    ?.classList
                    .add("open");
            }
        );


    $("#checkout-form")
        ?.addEventListener(
            "submit",
            (event) => {

                event.preventDefault();

                if (!cart.length) {
                    alert("Your cart is empty.");
                    $("#checkout-modal")?.classList.remove("open");
                    return;
                }

                const data = new FormData(event.currentTarget);
                const items = cart
                    .map((item) => `${item.name} x${Number(item.quantity || 1)} - ${money(Number(item.price || 0) * Number(item.quantity || 1))}`)
                    .join("\n");
                const total = cart.reduce(
                    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
                    0
                );
                const message = [
                    "New Ali Gemora Cart Order Enquiry",
                    `Name: ${String(data.get("name") || "").trim()}`,
                    `Phone: ${String(data.get("phone") || "").trim()}`,
                    `City: ${String(data.get("city") || "").trim()}`,
                    `Address: ${String(data.get("address") || "").trim()}`,
                    "Items:",
                    items,
                    `Total: ${money(total)}`
                ].join("\n");

                const whatsappUrl = `https://wa.me/${ORDER_ENQUIRY_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                $("#checkout-modal")?.classList.remove("open");

            }
        );


    /* Main order enquiry */

   $("#enquiry-form")
      ?.addEventListener(
          "submit",
          (event) => {

              event.preventDefault();

              const form = event.currentTarget;
              const data = new FormData(form);

              const message = [
                  "New Ali Gemora Order Enquiry",
                  `Name: ${data.get("name")}`,
                  `Phone: ${data.get("phone")}`,
                  `City: ${data.get("city")}`,
                  `Address: ${data.get("address")}`
              ].join("\n");

              const whatsappUrl =
                  `https://wa.me/${ORDER_ENQUIRY_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

              window.open(whatsappUrl, "_blank");

              form.reset();
          }
      );


    /* Mobile menu */

    $("#menu-toggle")
        ?.addEventListener(
            "click",
            () => {

                const nav =
                    $("#main-nav");

                const button =
                    $("#menu-toggle");


                nav?.classList.toggle(
                    "open"
                );


                const isOpen =
                    nav?.classList.contains(
                        "open"
                    );


                button?.setAttribute(
                    "aria-expanded",
                    String(isOpen)
                );
            }
        );


    /* Global clicks */

    document.addEventListener(
        "click",
        (event) => {

            const buy =
                event.target.closest(
                    "[data-buy], [data-modal-buy]"
                );


            if (buy) {

                const id =
                    buy.dataset.buy ||
                    buy.dataset.modalBuy;


                const product =
                    catalog.find(
                        (item) =>
                            String(item.id) ===
                            String(id)
                    );


                if (product) {

                    addToCart(product);

                    $("#product-modal")
                        ?.classList
                        .remove("open");
                }

                return;
            }


            const details =
                event.target.closest(
                    "[data-detail]"
                );


            if (details) {

                const product =
                    catalog.find(
                        (item) =>
                            String(item.id) ===
                            String(details.dataset.detail)
                    );


                if (product) {
                    openProductDetails(product);
                }

                return;
            }


            const remove =
                event.target.closest(
                    "[data-remove]"
                );


            if (remove) {

                cart =
                    cart.filter(
                        (item) =>
                            String(item.id) !==
                            String(remove.dataset.remove)
                    );


                updateCart();

                return;
            }


            const quantity =
                event.target.closest(
                    "[data-qty]"
                );


            if (quantity) {

                const product =
                    cart.find(
                        (item) =>
                            String(item.id) ===
                            String(quantity.dataset.qty)
                    );


                if (product) {

                    product.quantity =
                        Math.max(
                            0,
                            Number(product.quantity || 0) +
                            Number(quantity.dataset.change)
                        );
                }


                cart =
                    cart.filter(
                        (item) =>
                            Number(item.quantity) > 0
                    );


                updateCart();

                return;
            }


            const category =
                event.target.closest(
                    "[data-category]"
                );


            if (category) {

                const categoryName =
                    category.dataset.category;


                const filter =
                    $("#category-filter");


                if (filter) {

                    const matchingOption =
                        [...filter.options]
                            .find(
                                (option) =>
                                    option.value.toLowerCase() ===
                                    categoryName.toLowerCase()
                            );


                    if (matchingOption) {
                        filter.value =
                            matchingOption.value;
                    }
                }


                $("#shop")
                    ?.scrollIntoView({
                        behavior: "smooth"
                    });


                refreshProducts();

                return;
            }


            const close =
                event.target.closest(
                    "[data-close-modal]"
                );


            if (close) {

                close.closest(".modal")
                    ?.classList
                    .remove("open");
            }


            if (
                event.target.classList.contains(
                    "modal"
                )
            ) {

                event.target.classList.remove(
                    "open"
                );
            }
        }
    );


    /* Escape key */

    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key !== "Escape") return;

            toggleCart(false);

            closeCertificateViewer();

            document
                .querySelectorAll(".modal.open")
                .forEach(
                    (modal) =>
                        modal.classList.remove("open")
                );
        }
    );
}


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

async function loadProducts() {

    const grid =
        $("#product-grid");


    if (grid) {

        grid.innerHTML = `
            <div class="loading-card">

                <div>

                    <span>◆</span>

                    <p>
                        Loading the Ali Gemora collection…
                    </p>

                </div>

            </div>
        `;
    }


    try {

        const data =
            await api("/api/products");


        catalog =
            Array.isArray(data)
                ? data
                : [];


        cart = cart
            .map((item) => {
                const current = catalog.find(
                    (product) => String(product.id) === String(item.id)
                );
                return current
                    ? { ...current, quantity: Math.max(1, Number(item.quantity || 1)) }
                    : null;
            })
            .filter(Boolean);

        updateCart();


        renderProducts(getFilteredProducts());

    } catch (error) {

        console.error(
            "Could not load products:",
            error
        );


        if (grid) {

            grid.innerHTML = `
                <div class="empty-results">

                    <p>
                        The collection is temporarily unavailable.
                    </p>

                    <small>
                        Please make sure the Ali Gemora backend is running.
                    </small>

                </div>
            `;
        }
    }


    renderZodiac();

    updateCart();
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        startIntro();

        setupEvents();

        setupChat();

        loadProducts();

    }
);
