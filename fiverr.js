const puppeteer = require("puppeteer");

const FIVERR_URL = "https://www.fiverr.com/";
const SEARCH_PHRASE =
    "I will develop python projects, ml scripts, and thesis code";
const SELLER_NAME = "Blop Morn";

async function waitClick(page, selectors, timeout = 20000) {
    const list = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of list) {
        try {
            const element = await page.waitForSelector(selector, {
                visible: true,
                timeout,
            });

            if (element) {
                await element.click();
                return true;
            }
        } catch (_) {
            // Try the next selector.
        }
    }

    return false;
}

async function firstVisible(page, selectors, timeout = 20000) {
    const list = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of list) {
        try {
            const element = await page.waitForSelector(selector, {
                visible: true,
                timeout,
            });

            if (element) return element;
        } catch (_) {
            // Try the next selector.
        }
    }

    return null;
}

async function clickText(page, texts, timeout = 20000) {
    const list = Array.isArray(texts) ? texts : [texts];

    for (const text of list) {
        const escaped = text.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        const xpath = `//*[contains(normalize-space(.), '${escaped}')]`;

        try {
            const handles = await page.$$(
                `::-p-xpath(${xpath})`
            );

            for (const handle of handles) {
                const visible = await handle.evaluate((el) => {
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();

                    return (
                        style.display !== "none" &&
                        style.visibility !== "hidden" &&
                        rect.width > 0 &&
                        rect.height > 0
                    );
                });

                if (visible) {
                    await handle.click();
                    return true;
                }
            }
        } catch (_) {
            // Try the next text.
        }
    }

    return false;
}

async function signIn(
    page,
    email = process.env.FIVERR_EMAIL,
    password = process.env.FIVERR_PASSWORD
) {
    if (!email || !password) {
        throw new Error(
            "Set FIVERR_EMAIL and FIVERR_PASSWORD environment variables."
        );
    }

    try {
        // Sign in / Login button.
        const signInClicked = await clickText(
            page,
            ["Sign In", "Log In", "Login"],
            10000
        );

        if (!signInClicked) return false;

        // Continue with email/username.
        const continueClicked = await clickText(
            page,
            ["Continue with email/username"],
            10000
        );

        if (!continueClicked) return false;

        // Email field.
        const emailField = await firstVisible(page, [
            "#email",
            'input[name="email"]',
            'input[type="email"]',
            'input[name="username"]',
            'input[autocomplete="username"]',
        ]);

        if (!emailField) return false;

        await emailField.click({ clickCount: 3 });
        await emailField.type(email);

        // Continue / Next.
        await clickText(
            page,
            ["Continue", "Continue with email", "Next"],
            10000
        );

        // Password field.
        const passwordField = await firstVisible(page, [
            'input[name="password"]',
            "#password",
            'input[type="password"]',
            'input[autocomplete="current-password"]',
        ]);

        if (!passwordField) return false;

        await passwordField.click({ clickCount: 3 });
        await passwordField.type(password);

        // Submit.
        const submitted = await clickText(
            page,
            ["Sign In", "Log In", "Continue"],
            10000
        );

        if (!submitted) {
            await passwordField.press("Enter");
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));

        return true;
    } catch (_) {
        return false;
    }
}

async function acceptCookies(page) {
    try {
        await clickText(page, ["Accept", "Accept all", "Got it"], 5000);
    } catch (_) {
        // Cookie dialog is optional.
    }
}

async function findSortButton(page) {
    const xpaths = [
        "//button[contains(normalize-space(.), 'Relevance') or contains(normalize-space(.), 'Sort by')]",

        "//button[@role='button' and (contains(normalize-space(.), 'Relevance') or contains(normalize-space(.), 'Sort by'))]",

        "//*[contains(normalize-space(.), 'Relevance') or contains(normalize-space(.), 'Sort by')]/ancestor::button[1]",

        "//button[.//svg and (contains(normalize-space(.), 'Relevance') or contains(normalize-space(.), 'Sort by'))]",
    ];

    for (const xpath of xpaths) {
        try {
            const handles = await page.$x(xpath);

            for (const handle of handles) {
                const visible = await handle.evaluate((el) => {
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();

                    return (
                        style.display !== "none" &&
                        style.visibility !== "hidden" &&
                        rect.width > 0 &&
                        rect.height > 0
                    );
                });

                if (visible) {
                    return handle;
                }
            }
        } catch (_) {
            // Try next XPath.
        }
    }

    // Last resort.
    try {
        const buttons = await page.$$("button");

        for (const button of buttons) {
            const data = await button.evaluate((btn) => ({
                visible: (() => {
                    const style = window.getComputedStyle(btn);
                    const rect = btn.getBoundingClientRect();

                    return (
                        style.display !== "none" &&
                        style.visibility !== "hidden" &&
                        rect.width > 0 &&
                        rect.height > 0
                    );
                })(),

                text: (btn.innerText || "")
                    .replace(/\n/g, " ")
                    .trim(),

                className: btn.className || "",
            }));

            if (!data.visible) continue;

            const text = data.text.toLowerCase();
            const className = String(data.className).toLowerCase();

            if (
                text.includes("relevance") ||
                text.includes("sort by") ||
                className.includes("chevron-icon-down")
            ) {
                return button;
            }
        }
    } catch (_) {
        // Ignore fallback errors.
    }

    return null;
}

async function selectNewestArrivals(page) {
    const xpaths = [
        "//li[contains(., 'Newest arrivals')]",

        "//button[contains(., 'Newest arrivals')]",

        "//div[@role='option' and contains(., 'Newest arrivals')]",

        "//*[contains(normalize-space(.), 'Newest arrivals')]",
    ];

    for (const xpath of xpaths) {
        try {
            const handles = await page.$x(xpath);

            for (const handle of handles) {
                const visible = await handle.evaluate((el) => {
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();

                    return (
                        style.display !== "none" &&
                        style.visibility !== "hidden" &&
                        rect.width > 0 &&
                        rect.height > 0
                    );
                });

                if (visible) {
                    await handle.click();
                    return true;
                }
            }
        } catch (_) {
            // Try next XPath.
        }
    }

    return false;
}

async function getSellerGigLink(page, sellerName) {
    const escaped = sellerName
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");

    const xpath =
        `//*[contains(normalize-space(.), '${escaped}')]`;

    try {
        const elements = await page.$x(xpath);

        for (const element of elements) {
            try {
                const link = await element.evaluateHandle((el) => {
                    let current = el;

                    for (let i = 0; i < 6 && current; i++) {
                        if (
                            current.tagName &&
                            current.tagName.toLowerCase() === "a"
                        ) {
                            return current;
                        }

                        current = current.parentElement;
                    }

                    return null;
                });

                const isElement = await link
                    .evaluate((el) => !!el)
                    .catch(() => false);

                if (!isElement) continue;

                const visible = await link.evaluate((el) => {
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();

                    return (
                        style.display !== "none" &&
                        style.visibility !== "hidden" &&
                        rect.width > 0 &&
                        rect.height > 0
                    );
                });

                if (visible) {
                    return link;
                }
            } catch (_) {
                // Continue searching.
            }
        }
    } catch (_) {
        // Ignore and use fallback below.
    }

    return null;
}

async function main() {
    const browser = await puppeteer.launch({
        headless: false,

        defaultViewport: null,

        args: [
            "--start-maximized",
            "--disable-blink-features=AutomationControlled",
        ],
    });

    const page = await browser.newPage();

    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(60000);

    try {
        // --------------------------------
        // Open Fiverr
        // --------------------------------

        await page.goto(FIVERR_URL, {
            waitUntil: "domcontentloaded",
        });

        // --------------------------------
        // Cookie acceptance
        // --------------------------------

        await acceptCookies(page);

        // --------------------------------
        // Sign in
        // --------------------------------

        const loggedIn = await signIn(page);

        if (!loggedIn) {
            throw new Error("Sign in failed.");
        }

        console.log("Sign-in flow completed.");

        // --------------------------------
        // Search
        // --------------------------------

        const searchInput = await firstVisible(page, [
            'input[placeholder*="Search"]',
            'input[aria-label*="Search"]',
            'input[name="search"]',
        ]);

        if (!searchInput) {
            throw new Error(
                "Could not find Fiverr search input."
            );
        }

        await searchInput.click({
            clickCount: 3,
        });

        await searchInput.type(SEARCH_PHRASE);

        await searchInput.press("Enter");

        // Wait for search results.
        await page
            .waitForNetworkIdle({
                idleTime: 1000,
                timeout: 15000,
            })
            .catch(() => { });

        // --------------------------------
        // Scroll before Sort by
        // --------------------------------

        await page.evaluate(() => {
            window.scrollTo({
                top: document.body.scrollHeight * 0.3,
                behavior: "smooth",
            });
        });

        await new Promise((resolve) =>
            setTimeout(resolve, 2000)
        );

        await page.evaluate(() => {
            window.scrollTo({
                top: document.body.scrollHeight * 0.75,
                behavior: "smooth",
            });
        });

        await new Promise((resolve) =>
            setTimeout(resolve, 2000)
        );

        // --------------------------------
        // Find and click sort
        // --------------------------------

        const sortButton = await findSortButton(page);

        if (!sortButton) {
            throw new Error(
                "Could not find Fiverr sort button " +
                "(label may be 'Relevance' or 'Sort by')."
            );
        }

        await sortButton.click();

        // --------------------------------
        // Select Newest arrivals
        // --------------------------------

        const newestSelected =
            await selectNewestArrivals(page);

        if (!newestSelected) {
            throw new Error(
                "Could not find the 'Newest arrivals' option."
            );
        }

        // Give results time to refresh.
        await new Promise((resolve) =>
            setTimeout(resolve, 3000)
        );

        // --------------------------------
        // Find seller and open gig
        // --------------------------------

        const sellerGig =
            await getSellerGigLink(
                page,
                SELLER_NAME
            );

        if (sellerGig) {
            await sellerGig.evaluate((el) => {
                el.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            });

            await new Promise((resolve) =>
                setTimeout(resolve, 500)
            );

            await sellerGig.click();
        } else {
            // Fallback.
            const clicked = await clickText(
                page,
                [SELLER_NAME],
                10000
            );

            if (!clicked) {
                throw new Error(
                    `Could not find seller '${SELLER_NAME}' on the page.`
                );
            }
        }

        console.log(
            `Opened the Fiverr gig for '${SELLER_NAME}'.`
        );

        // Browser remains open for manual verification.
    } catch (error) {
        console.error(
            "ERROR:",
            error.message
        );

        console.error(
            error.stack
        );

        // Browser remains open for inspection.
    }
}

main().catch((error) => {
    console.error(error);

    process.exitCode = 1;
});