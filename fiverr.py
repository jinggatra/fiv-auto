import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options


def wait_click(driver, wait, locator, timeout=20):
    try:
        element = wait.until(EC.element_to_be_clickable(locator), message=f"Unable to click: {locator}")
        element.click()
        return True
    except Exception:
        return False

def get_seller_gig_link(driver, seller_name):
    seller_xpath = f"//*[contains(normalize-space(.), '{seller_name}')]"
    elements = driver.find_elements(By.XPATH, seller_xpath)
    for element in elements:
        try:
            # Try to move up to the nearest clickable link that likely contains a gig
            clickable = element
            for _ in range(5):
                tag = clickable.tag_name.lower()
                if tag == "a":
                    break
                clickable = clickable.find_element(By.XPATH, "./ancestor::a[1]")
            if clickable and clickable.is_displayed():
                return clickable
        except Exception:
            pass
    return None


def sign_in(driver, wait, email=None, password=None):
    email = email or os.getenv("FIVERR_EMAIL")
    password = password or os.getenv("FIVERR_PASSWORD")

    if not email or not password:
        raise ValueError("Set FIVERR_EMAIL and FIVERR_PASSWORD in environment variables or pass email/password to sign_in().")

    try:
        sign_in_button = None
        for locator in [
            (By.XPATH, "//a[contains(., 'Sign in') or contains(., 'Log in') or contains(., 'Login')]"),
            (By.XPATH, "//button[contains(., 'Sign in') or contains(., 'Log in') or contains(., 'Login')]"),
            (By.XPATH, "//*[contains(normalize-space(.), 'Sign in') or contains(normalize-space(.), 'Log in') or contains(normalize-space(.), 'Login')]"),
        ]:
            try:
                sign_in_button = wait.until(EC.element_to_be_clickable(locator))
                break
            except Exception:
                pass

        if sign_in_button is None:
            return False

        sign_in_button.click()

        continue_btn = None
        for locator in [
            (By.XPATH, "//a[contains(normalize-space(.), 'Continue with email/username')]"),
            (By.XPATH, "//button[contains(normalize-space(.), 'Continue with email/username')]"),
            (By.XPATH, "//*[contains(normalize-space(.), 'Continue with email/username')]"),
        ]:
            try:
                continue_btn = wait.until(EC.element_to_be_clickable(locator))
                break
            except Exception:
                pass

        if continue_btn is None:
            return False

        continue_btn.click()

        email_field = None
        for locator in [
            (By.ID, "email"),
            (By.NAME, "email"),
            (By.CSS_SELECTOR, "input[type='email']"),
            (By.CSS_SELECTOR, "input[name='username']"),
            (By.CSS_SELECTOR, "input[autocomplete='username']"),
        ]:
            try:
                email_field = wait.until(EC.visibility_of_element_located(locator))
                break
            except Exception:
                pass

        if email_field is None:
            return False

        email_field.clear()
        email_field.send_keys(email)

        continue_btn = None
        for locator in [
            (By.XPATH, "//button[contains(., 'Continue') or contains(., 'Continue with email') or contains(., 'Next')]"),
            (By.XPATH, "//input[@type='submit' or @value='Continue' or @value='Next']"),
        ]:
            try:
                continue_btn = wait.until(EC.element_to_be_clickable(locator))
                break
            except Exception:
                pass

        if continue_btn is not None:
            continue_btn.click()

        password_field = None
        for locator in [
            (By.NAME, "password"),
            (By.ID, "password"),
            (By.CSS_SELECTOR, "input[type='password']"),
            (By.CSS_SELECTOR, "input[autocomplete='current-password']"),
        ]:
            try:
                password_field = wait.until(EC.visibility_of_element_located(locator))
                break
            except Exception:
                pass

        if password_field is None:
            return False

        password_field.clear()
        password_field.send_keys(password)

        submit_btn = None
        for locator in [
            (By.XPATH, "//button[contains(., 'Sign in') or contains(., 'Log in') or contains(., 'Continue')]"),
            (By.XPATH, "//input[@type='submit' or @value='Sign in' or @value='Log in' or @value='Continue']"),
        ]:
            try:
                submit_btn = wait.until(EC.element_to_be_clickable(locator))
                break
            except Exception:
                pass

        if submit_btn is not None:
            submit_btn.click()

        time.sleep(3)
        return True
    except Exception:
        return False

# ---------- Setup ----------
options = Options()
options.add_argument("--start-maximized")
options.add_argument("--disable-blink-features=AutomationControlled")
driver = webdriver.Chrome(options=options)
wait = WebDriverWait(driver, 20)

url = "https://www.fiverr.com/"
driver.get(url)

# ---------- Cookie acceptance (optional) ----------
try:
    accept_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Accept') or contains(., 'Accept all') or contains(., 'Got it')]")))
    accept_btn.click()
except Exception:
    pass

# ---------- Sign in before searching ----------
try:
    sign_in(driver, wait)
except ValueError as exc:
    raise SystemExit(f"Sign in failed: {exc}")

# ---------- Search ----------
search_phrase = "I will develop python projects, ml scripts, and thesis code"
search_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder*='Search'], input[aria-label*='Search'], input[name='search']")))
search_input.clear()
search_input.send_keys(search_phrase)
search_input.send_keys(Keys.ENTER)

# Wait for results page
# wait.until(EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'search-results')] | //section[contains(@class, 'search-results')] | //div[contains(@data-testid, 'search-results')]")))

# ---------- Scroll down before clicking "Sort by" ----------
driver.execute_script("window.scrollTo(0, document.body.scrollHeight * 0.3);")
time.sleep(2)
driver.execute_script("window.scrollTo(0, document.body.scrollHeight * 0.75);")
time.sleep(2)

# ---------- Click the active sort control (Fiverr often shows 'Relevance' first, not 'Sort by') ----------
def find_sort_button(wait):
    candidates = [
        (By.XPATH, "//button[contains(normalize-space(.), 'Relevance') or contains(normalize-space(.), 'Sort by')]"),
        (By.XPATH, "//button[@role='button' and (contains(normalize-space(.), 'Relevance') or contains(normalize-space(.), 'Sort by'))]"),
        (By.XPATH, "//*[contains(normalize-space(.), 'Relevance') or contains(normalize-space(.), 'Sort by')]/ancestor::button[1]"),
        (By.XPATH, "//button[.//span[contains(@class, 'chevron-icon-down')]]"),
        (By.XPATH, "//button[.//svg and (contains(normalize-space(.), 'Relevance') or contains(normalize-space(.), 'Sort by'))]"),
    ]

    for locator in candidates:
        try:
            elem = wait.until(EC.element_to_be_clickable(locator))
            if elem and elem.is_displayed():
                return elem
        except Exception:
            pass

    # Last resort: find any visible button with a chevron and text that matches a sort label.
    try:
        for btn in driver.find_elements(By.XPATH, "//button[@role='button' or @data-track-tag='button']"):
            if not btn.is_displayed():
                continue
            text = (btn.text or "").replace("\n", " ").strip()
            if any(keyword in text.lower() for keyword in ["relevance", "sort by"]) or any(
                "chevron-icon-down" in cls.lower() for cls in (btn.get_attribute("class") or "").split()
            ):
                return btn
    except Exception:
        pass

    return None

sort_button = find_sort_button(wait)
if sort_button is None:
    raise Exception("Could not find the Fiverr sort button (label may be 'Relevance' or 'Sort by').")

sort_button.click()

# ---------- Select "Newest arrivals" ----------
newest_option = None
for locator in [
    (By.XPATH, "//li[contains(., 'Newest arrivals')]"),
    (By.XPATH, "//button[contains(., 'Newest arrivals')]"),
    (By.XPATH, "//div[contains(@role, 'option') and contains(., 'Newest arrivals')]"),
    (By.XPATH, "//*[contains(normalize-space(.), 'Newest arrivals')]"),
]:
    try:
        newest_option = wait.until(EC.element_to_be_clickable(locator))
        break
    except Exception:
        pass

if newest_option is None:
    raise Exception("Could not find the 'Newest arrivals' option.")

newest_option.click()

# Give results a moment to refresh
time.sleep(3)

# ---------- Find "Blop Morn" and click the gig ----------
seller_gig = get_seller_gig_link(driver, "Blop Morn")
if seller_gig is None:
    # Fallback: search page text for "Blop Morn" and click the nearest visible text block
    try:
        seller_name = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(normalize-space(.), 'Blop Morn')]")))
        seller_name.click()
    except Exception:
        raise Exception("Could not find seller 'Blop Morn' on the page.")
else:
    driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", seller_gig)
    seller_gig.click()

print("Opened the Fiverr gig for 'Blop Morn'.")

# Keep browser open for manual verification if needed
# input("Press Enter to close browser...")
# driver.quit()