ALI GEMORA — LOCAL STARTER PROJECT

IMPORTANT:
1. Keep your original homepage image named exactly: ali-gemora.png.png
2. Copy that image into the frontend folder next to index.html.
3. Product names, images, and prices in backend/data/products.py are sample/demo data. Replace them with your real catalogue before taking customer orders.
4. The order enquiry form is a front-end form. To actually receive orders, connect it to your preferred email/WhatsApp/backend service.

RUN ON WINDOWS:
Open PowerShell in this folder and run:

py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py -m uvicorn backend.main:app --reload

Then open http://127.0.0.1:8000

If PowerShell blocks activation, run:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

Your homepage hero image is referenced by filename and is not replaced by this package.

ADMIN PANEL
Open /admin on the running site. Keep ADMIN_PASSWORD_SALT, ADMIN_PASSWORD_HASH,
and ADMIN_SESSION_SECRET in environment variables; do not commit .env. The panel
allows authenticated name, price, and image updates. COOKIE_SECURE=true should be set on
Render so the admin session cookie is HTTPS-only.

RENDER DATA STORAGE
Set DATABASE_URL to a Render Postgres connection string. Price overrides are then
stored in Postgres and the existing backend/data/price_overrides.json and
backend/data/name_overrides.json are migrated
automatically the first time the database is used. If DATABASE_URL is absent, local
development uses the JSON file fallback.

Uploaded images use IMAGE_STORAGE_DIR and are served from /uploads/<filename>. For
Render, attach a paid persistent disk at /var/data/ali-gemora-images and set
IMAGE_STORAGE_DIR=/var/data/ali-gemora-images. The image mapping file and new image
files are then written under the disk. Existing frontend/images files and the legacy
backend/data/image_overrides.json are preserved and still work. If you deploy on the
free web-service plan, uploaded files will still be lost because free services cannot
use persistent disks; use object storage instead or upgrade the web service.

RENDER START COMMAND
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
