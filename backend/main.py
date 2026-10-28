from datetime import date
import hashlib
import hmac
import json
import math
import os
import secrets
import time
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.data.gemstones import GEMSTONES, ZODIAC, ZODIAC_TRADITIONS
from backend.data.products import PRODUCTS


# =========================================================
# PATHS
# =========================================================

# Ali Gemora/
# ├── backend/
# │   └── main.py
# └── frontend/
#
# main.py -> parent = backend
# parent.parent = Ali Gemora

ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT / "frontend"
ENV_FILE = ROOT / ".env"
PRICE_OVERRIDES_FILE = ROOT / "backend" / "data" / "price_overrides.json"
NAME_OVERRIDES_FILE = ROOT / "backend" / "data" / "name_overrides.json"
LEGACY_IMAGE_OVERRIDES_FILE = ROOT / "backend" / "data" / "image_overrides.json"
IMAGE_STORAGE_DIR = Path(
    os.environ.get(
        "IMAGE_STORAGE_DIR",
        str(ROOT / "backend" / "data" / "uploads"),
    )
)
IMAGE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
IMAGE_STORAGE_OVERRIDES_FILE = IMAGE_STORAGE_DIR / "image_overrides.json"


def load_local_env():
    """Load the local .env without adding a dependency just for this panel."""
    if not ENV_FILE.exists():
        return
    for raw_line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_local_env()

ADMIN_PASSWORD_SALT = os.environ.get("ADMIN_PASSWORD_SALT", "")
ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH", "")
ADMIN_SESSION_SECRET = os.environ.get("ADMIN_SESSION_SECRET", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
ADMIN_SESSION_COOKIE = "ali_gemora_admin"
ADMIN_SESSION_SECONDS = 60 * 60 * 12

# Comma-separated production frontend origins, set in Enzonic's environment
# variables (for example: https://ali-gemora.vercel.app). Keeping this empty
# by default prevents accidental unrestricted cross-origin access.
FRONTEND_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.environ.get("FRONTEND_ORIGINS", "").split(",")
    if origin.strip()
]


def password_hash(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        310000,
    ).hex()


def valid_admin_password(password: str) -> bool:
    if not ADMIN_PASSWORD_SALT or not ADMIN_PASSWORD_HASH:
        return False
    candidate = password_hash(password.strip(), ADMIN_PASSWORD_SALT)
    return hmac.compare_digest(candidate, ADMIN_PASSWORD_HASH)


def session_token() -> str:
    expires = str(int(time.time()) + ADMIN_SESSION_SECONDS)
    signature = hmac.new(
        ADMIN_SESSION_SECRET.encode("utf-8"),
        expires.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{expires}.{signature}"


def admin_authenticated(request: Request) -> bool:
    if not ADMIN_SESSION_SECRET:
        return False
    token = request.cookies.get(ADMIN_SESSION_COOKIE, "")
    try:
        expires, signature = token.split(".", 1)
        expected = hmac.new(
            ADMIN_SESSION_SECRET.encode("utf-8"),
            expires.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        return int(expires) > int(time.time()) and hmac.compare_digest(signature, expected)
    except (ValueError, TypeError):
        return False


def require_admin(request: Request):
    if not admin_authenticated(request):
        raise HTTPException(status_code=401, detail="Admin login required")


def load_price_overrides():
    local_data = {}
    if PRICE_OVERRIDES_FILE.exists():
        try:
            data = json.loads(PRICE_OVERRIDES_FILE.read_text(encoding="utf-8"))
            local_data = data if isinstance(data, dict) else {}
        except (OSError, json.JSONDecodeError):
            local_data = {}

    if not DATABASE_URL:
        return local_data

    try:
        import psycopg
        with psycopg.connect(DATABASE_URL) as connection:
            connection.execute("CREATE TABLE IF NOT EXISTS ali_gemora_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT NOT NULL)")
            row = connection.execute("SELECT setting_value FROM ali_gemora_settings WHERE setting_key = %s", ("price_overrides",)).fetchone()
            if row:
                value = json.loads(row[0])
                return value if isinstance(value, dict) else {}
            connection.execute("INSERT INTO ali_gemora_settings (setting_key, setting_value) VALUES (%s, %s) ON CONFLICT (setting_key) DO NOTHING", ("price_overrides", json.dumps(local_data)))
            return local_data
    except ImportError as error:
        raise RuntimeError("DATABASE_URL is set but psycopg is not installed") from error


def save_price_overrides(overrides):
    if DATABASE_URL:
        try:
            import psycopg
            with psycopg.connect(DATABASE_URL) as connection:
                connection.execute("CREATE TABLE IF NOT EXISTS ali_gemora_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT NOT NULL)")
                connection.execute("INSERT INTO ali_gemora_settings (setting_key, setting_value) VALUES (%s, %s) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value", ("price_overrides", json.dumps(overrides)))
            return
        except ImportError as error:
            raise RuntimeError("DATABASE_URL is set but psycopg is not installed") from error
    PRICE_OVERRIDES_FILE.write_text(
        json.dumps(overrides, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def load_name_overrides():
    local_data = {}
    if NAME_OVERRIDES_FILE.exists():
        try:
            data = json.loads(NAME_OVERRIDES_FILE.read_text(encoding="utf-8"))
            local_data = data if isinstance(data, dict) else {}
        except (OSError, json.JSONDecodeError):
            local_data = {}

    if not DATABASE_URL:
        return local_data

    try:
        import psycopg
        with psycopg.connect(DATABASE_URL) as connection:
            connection.execute("CREATE TABLE IF NOT EXISTS ali_gemora_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT NOT NULL)")
            row = connection.execute("SELECT setting_value FROM ali_gemora_settings WHERE setting_key = %s", ("name_overrides",)).fetchone()
            if row:
                value = json.loads(row[0])
                return value if isinstance(value, dict) else {}
            connection.execute("INSERT INTO ali_gemora_settings (setting_key, setting_value) VALUES (%s, %s) ON CONFLICT (setting_key) DO NOTHING", ("name_overrides", json.dumps(local_data)))
            return local_data
    except ImportError as error:
        raise RuntimeError("DATABASE_URL is set but psycopg is not installed") from error


def save_name_overrides(overrides):
    if DATABASE_URL:
        try:
            import psycopg
            with psycopg.connect(DATABASE_URL) as connection:
                connection.execute("CREATE TABLE IF NOT EXISTS ali_gemora_settings (setting_key TEXT PRIMARY KEY, setting_value TEXT NOT NULL)")
                connection.execute("INSERT INTO ali_gemora_settings (setting_key, setting_value) VALUES (%s, %s) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value", ("name_overrides", json.dumps(overrides)))
            return
        except ImportError as error:
            raise RuntimeError("DATABASE_URL is set but psycopg is not installed") from error
    NAME_OVERRIDES_FILE.write_text(
        json.dumps(overrides, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def load_image_overrides():
    merged = {}
    for path in (LEGACY_IMAGE_OVERRIDES_FILE, IMAGE_STORAGE_OVERRIDES_FILE):
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                merged.update(data)
        except (OSError, json.JSONDecodeError):
            continue
    return merged


def save_image_overrides(overrides):
    IMAGE_STORAGE_OVERRIDES_FILE.write_text(
        json.dumps(overrides, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


PRICE_OVERRIDES = load_price_overrides()
for product in PRODUCTS:
    if product["id"] in PRICE_OVERRIDES:
        product["price"] = PRICE_OVERRIDES[product["id"]]

NAME_OVERRIDES = load_name_overrides()
for product in PRODUCTS:
    if product["id"] in NAME_OVERRIDES:
        product["name"] = NAME_OVERRIDES[product["id"]]

IMAGE_OVERRIDES = load_image_overrides()
for product in PRODUCTS:
    if product["id"] in IMAGE_OVERRIDES:
        product["image"] = IMAGE_OVERRIDES[product["id"]]


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="Ali Gemora Gemstones API",
    version="1.0.0"
)

if FRONTEND_DIR.exists():
    app.mount(
        "/images",
        StaticFiles(directory=str(FRONTEND_DIR)),
        name="images"
    )

app.mount(
    "/uploads",
    StaticFiles(directory=str(IMAGE_STORAGE_DIR)),
    name="uploads"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# REQUEST MODELS
# =========================================================

class RecommendRequest(BaseModel):
    date_of_birth: date


class ChatRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=500
    )


class AdminLoginRequest(BaseModel):
    password: str = Field(min_length=1, max_length=200)


class AdminPasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=12, max_length=200)


class AdminPricesRequest(BaseModel):
    prices: dict[str, float]


class AdminNamesRequest(BaseModel):
    names: dict[str, str]


# =========================================================
# ZODIAC FUNCTION
# =========================================================

def zodiac_for(birth_date: date) -> str:

    md = (birth_date.month, birth_date.day)

    ranges = [
        ((3, 21), (4, 19), "Aries"),
        ((4, 20), (5, 20), "Taurus"),
        ((5, 21), (6, 20), "Gemini"),
        ((6, 21), (7, 22), "Cancer"),
        ((7, 23), (8, 22), "Leo"),
        ((8, 23), (9, 22), "Virgo"),
        ((9, 23), (10, 22), "Libra"),
        ((10, 23), (11, 21), "Scorpio"),
        ((11, 22), (12, 21), "Sagittarius"),
        ((12, 22), (1, 19), "Capricorn"),
        ((1, 20), (2, 18), "Aquarius"),
        ((2, 19), (3, 20), "Pisces"),
    ]

    for start, end, sign in ranges:

        # Normal range e.g. Aries: March 21 -> April 19
        if start[0] <= end[0]:

            if start <= md <= end:
                return sign

        # Cross-year range e.g. Capricorn:
        # December 22 -> January 19
        else:

            if md >= start or md <= end:
                return sign

    return "Aries"


# =========================================================
# FIND STONE / PRODUCT
# =========================================================

def stone_for(name: str):

    name = name.lower().strip()

    found = next(
        (
            p
            for p in PRODUCTS
            if (
                p["name"].lower() == name
                or p["category"].lower() == name
            )
        ),
        None
    )

    return found or PRODUCTS[0]


# =========================================================
# GEMSTONES API
# =========================================================

@app.get("/api/gemstones")
@app.get("/gemstones")
def gemstones():

    return PRODUCTS


# =========================================================
# PRIVATE ADMIN PANEL
# =========================================================

@app.get("/admin")
def admin_page():
    if not FRONTEND_DIR.exists():
        raise HTTPException(status_code=404, detail="Admin UI is deployed separately")
    return FileResponse(FRONTEND_DIR / "admin.html")


@app.post("/api/admin/login")
def admin_login(payload: AdminLoginRequest, response: Response):
    if not valid_admin_password(payload.password):
        raise HTTPException(status_code=401, detail="Incorrect admin password")

    response.set_cookie(
        ADMIN_SESSION_COOKIE,
        session_token(),
        max_age=ADMIN_SESSION_SECONDS,
        httponly=True,
        samesite="strict",
        secure=os.environ.get("COOKIE_SECURE", "false").lower() == "true",
        path="/",
    )
    return {"ok": True}


@app.post("/api/admin/logout")
def admin_logout(response: Response):
    response.delete_cookie(ADMIN_SESSION_COOKIE, path="/")
    return {"ok": True}


@app.get("/api/admin/session")
def admin_session(request: Request):
    return {"authenticated": admin_authenticated(request)}


@app.get("/api/admin/products")
def admin_products(request: Request):
    require_admin(request)
    return [
        {"id": p["id"], "name": p["name"], "category": p["category"], "price": p["price"]}
        for p in PRODUCTS
    ]


@app.put("/api/admin/prices")
def update_admin_prices(payload: AdminPricesRequest, request: Request):
    require_admin(request)
    product_ids = {p["id"] for p in PRODUCTS}
    unknown_ids = set(payload.prices) - product_ids
    if unknown_ids:
        raise HTTPException(status_code=400, detail="Unknown product in price update")

    for product_id, price in payload.prices.items():
        if not math.isfinite(price) or price <= 0 or price > 1_000_000_000_000:
            raise HTTPException(status_code=400, detail="Prices must be positive valid numbers")

    PRICE_OVERRIDES.update({product_id: round(price, 2) for product_id, price in payload.prices.items()})
    save_price_overrides(PRICE_OVERRIDES)
    for product in PRODUCTS:
        if product["id"] in payload.prices:
            product["price"] = PRICE_OVERRIDES[product["id"]]
    return {"ok": True, "updated": len(payload.prices)}


@app.put("/api/admin/names")
def update_admin_names(payload: AdminNamesRequest, request: Request):
    require_admin(request)
    product_ids = {p["id"] for p in PRODUCTS}
    unknown_ids = set(payload.names) - product_ids
    if unknown_ids:
        raise HTTPException(status_code=400, detail="Unknown product in name update")

    cleaned_names = {}
    for product_id, name in payload.names.items():
        cleaned = str(name).strip()
        if not cleaned or len(cleaned) > 120:
            raise HTTPException(status_code=400, detail="Names must be 1 to 120 characters")
        cleaned_names[product_id] = cleaned

    NAME_OVERRIDES.update(cleaned_names)
    save_name_overrides(NAME_OVERRIDES)
    for product in PRODUCTS:
        if product["id"] in cleaned_names:
            product["name"] = cleaned_names[product["id"]]
    return {"ok": True, "updated": len(cleaned_names)}


@app.post("/api/admin/products/{product_id}/image")
async def update_admin_image(product_id: str, request: Request, image: UploadFile = File(...)):
    require_admin(request)
    product = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    allowed_types = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    suffix = allowed_types.get(image.content_type or "")
    if not suffix:
        raise HTTPException(status_code=400, detail="Upload a JPG, PNG, or WebP image")

    content = await image.read()
    if not content or len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be smaller than 10 MB")

    signatures = {
        ".jpg": content.startswith(b"\xff\xd8\xff"),
        ".png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        ".webp": len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP",
    }
    if not signatures[suffix]:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image")

    filename = f"admin-{product_id}-{secrets.token_hex(8)}{suffix}"
    target = IMAGE_STORAGE_DIR / filename
    target.write_bytes(content)
    image_url = f"/uploads/{filename}"
    IMAGE_OVERRIDES[product_id] = image_url
    save_image_overrides(IMAGE_OVERRIDES)
    product["image"] = image_url
    return {"ok": True, "image": image_url}


def update_env_values(values: dict[str, str]):
    lines = ENV_FILE.read_text(encoding="utf-8").splitlines() if ENV_FILE.exists() else []
    written = set()
    output = []
    for line in lines:
        key = line.split("=", 1)[0].strip() if "=" in line else ""
        if key in values:
            output.append(f"{key}={values[key]}")
            written.add(key)
        else:
            output.append(line)
    for key, value in values.items():
        if key not in written:
            output.append(f"{key}={value}")
    ENV_FILE.write_text("\n".join(output) + "\n", encoding="utf-8")


@app.post("/api/admin/password")
def change_admin_password(payload: AdminPasswordChangeRequest, request: Request):
    require_admin(request)
    if not valid_admin_password(payload.current_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    new_salt = secrets.token_urlsafe(32)
    new_hash = password_hash(payload.new_password, new_salt)
    update_env_values({"ADMIN_PASSWORD_SALT": new_salt, "ADMIN_PASSWORD_HASH": new_hash})

    global ADMIN_PASSWORD_SALT, ADMIN_PASSWORD_HASH
    ADMIN_PASSWORD_SALT = new_salt
    ADMIN_PASSWORD_HASH = new_hash
    return {"ok": True}


# =========================================================
# PRODUCTS API
# =========================================================

@app.get("/api/products")
@app.get("/products")
def products():

    return PRODUCTS


# =========================================================
# SINGLE PRODUCT
# =========================================================

@app.get("/api/products/{product_id}")
@app.get("/products/{product_id}")
def product(product_id: str):

    product_id = product_id.lower()

    result = next(
        (
            p
            for p in PRODUCTS
            if (
                p["id"].lower() == product_id
                or p["slug"].lower() == product_id
            )
        ),
        None
    )

    if not result:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return result


# =========================================================
# SINGLE GEMSTONE
# =========================================================

@app.get("/api/gemstones/{stone_id}")
def gemstone(stone_id: str):

    stone_id = stone_id.lower()

    result = next(
        (
            s
            for s in GEMSTONES
            if s["id"].lower() == stone_id
        ),
        None
    )

    if not result:

        raise HTTPException(
            status_code=404,
            detail="Gemstone not found"
        )

    return result


# =========================================================
# ZODIAC API
# =========================================================

@app.get("/api/zodiac/{sign}")
@app.get("/zodiac/{sign}")
def zodiac(sign: str):

    key = sign.title()

    if key not in ZODIAC_TRADITIONS:

        raise HTTPException(
            status_code=404,
            detail="Zodiac sign not found"
        )

    tradition = ZODIAC_TRADITIONS[key]

    return {
        "zodiac_sign": key,
        **tradition,
        "recommended_stone": stone_for(
            tradition["primary"]
        )
    }


# =========================================================
# RECOMMEND GEMSTONE
# =========================================================

@app.post("/api/recommend")
@app.post("/api/recommend-stone")
@app.post("/recommend-stone")
def recommend(request: RecommendRequest):

    sign = zodiac_for(
        request.date_of_birth
    )

    stone_name, reason = ZODIAC[sign]

    tradition = ZODIAC_TRADITIONS[sign]

    return {
        "date_of_birth":
            request.date_of_birth.isoformat(),

        "zodiac":
            sign,

        "zodiac_sign":
            sign,

        "recommended_stone":
            stone_for(stone_name),

        "reason":
            reason
            + " This is traditional astrological guidance, not a scientific claim.",

        **tradition,

        "notice":
            "Traditional associations are offered for personal reflection, not as a scientific guarantee."
    }


# =========================================================
# CHAT API
# =========================================================

@app.post("/api/chat")
def chat(request: ChatRequest):

    message = request.message.strip().lower()

    mentioned = next(
        (
            s
            for s in GEMSTONES
            if (
                s["name"].lower() in message
                or s["id"].lower() in message
            )
        ),
        None
    )

    if mentioned:

        benefits = ", ".join(
            mentioned["benefits"]
        )

        return {
            "reply":
                f'{mentioned["name"]} is traditionally associated with '
                f'{benefits}. '
                f'{mentioned["description"]} '
                f'These are symbolic traditions, not scientific claims.'
        }


    if (
        "birth" in message
        or "dob" in message
        or any(
            sign.lower() in message
            for sign in ZODIAC
        )
    ):

        return {
            "reply":
                "Enter your date of birth in the Zodiac Finder "
                "to explore a traditional gemstone association."
        }


    if (
        "price" in message
        or "cost" in message
    ):

        return {
            "reply":
                "Prices shown are sample prices in this starter catalogue. "
                "Please confirm final prices before placing an order."
        }


    return {
        "reply":
            "Ask me about Ruby, Emerald, Blue Sapphire, "
            "Amethyst, Aqeeq, Citrine, prices, "
            "or traditional zodiac associations."
    }


# =========================================================
# IMAGE / STATIC FILES
# =========================================================

# The frontend is deployed separately on Vercel. When a full project checkout
# is used, this mount can still serve its frontend assets; the backend-only
# Enzonic deployment intentionally has no frontend directory.


# =========================================================
# FRONTEND
# =========================================================

# IMPORTANT:
# Ye sabse LAST mein hona chahiye.
# "/" ko frontend folder serve karega.

if FRONTEND_DIR.exists():
    app.mount(
        "/",
        StaticFiles(
            directory=FRONTEND_DIR,
            html=True
        ),
        name="frontend"
    )
print("ROOT =", ROOT)
print("FRONTEND_DIR =", FRONTEND_DIR)
if FRONTEND_DIR.exists():
    print("FRONTEND ASSET ROOT EXISTS =", True)
    print("HERO IMAGE EXISTS =", (FRONTEND_DIR / "ali-gemora.png.png").exists())
else:
    print("FRONTEND ASSET ROOT EXISTS =", False)
    print("Frontend assets are deployed separately; Vercel serves catalog images.")
