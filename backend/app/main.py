
import os
import hashlib
import logging
import secrets
import smtplib
from contextlib import asynccontextmanager
from datetime import date, time, timedelta
from email.message import EmailMessage
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from uuid import uuid4

import psycopg
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.auth import (
    create_access_token,
    hash_password,
    require_admin,
    verify_password,
)

# -------------------- CONFIGURATION --------------------

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env", override=False)

DATABASE_URL = os.getenv("DATABASE_URL")
DB_SSLMODE = os.getenv("DB_SSLMODE", "require")
logger = logging.getLogger(__name__)
RESET_TOKEN_LIFETIME_MINUTES = 20
RESET_GENERIC_MESSAGE = (
    "If an account exists with this email, password reset instructions have been sent."
)
RESET_INVALID_MESSAGE = (
    "This reset link is invalid or has expired. Request a new link."
)

ORDER_STATUSES = [
    "Pending",
    "Confirmed",
    "Preparing",
    "Ready",
    "Completed",
    "Cancelled",
]

BOOKING_STATUSES = [
    "Pending",
    "Confirmed",
    "Completed",
    "Cancelled",
]


def get_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL environment variable is missing.")

    return psycopg.connect(
        DATABASE_URL,
        sslmode=DB_SSLMODE,
        row_factory=dict_row,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    with get_connection() as connection:
        connection.execute("SELECT 1")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS public.orders (
                id BIGSERIAL PRIMARY KEY,
                order_number VARCHAR(20) NOT NULL UNIQUE,
                customer_name VARCHAR(100) NOT NULL,
                phone VARCHAR(10) NOT NULL,
                customer_email VARCHAR(254),
                order_type VARCHAR(20) NOT NULL,
                address TEXT,
                items JSONB NOT NULL,
                total_amount NUMERIC(12, 2) NOT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'Pending',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS public.bookings (
                id BIGSERIAL PRIMARY KEY,
                booking_number VARCHAR(20) NOT NULL UNIQUE,
                customer_name VARCHAR(100) NOT NULL,
                phone VARCHAR(10) NOT NULL,
                customer_email VARCHAR(254),
                booking_date DATE NOT NULL,
                booking_time TIME NOT NULL,
                guests SMALLINT NOT NULL,
                special_request TEXT,
                status VARCHAR(30) NOT NULL DEFAULT 'Pending',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS public.reviews (
                id BIGSERIAL PRIMARY KEY,
                customer_name VARCHAR(100) NOT NULL,
                rating SMALLINT NOT NULL,
                review_text TEXT NOT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'Pending',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS public.manual_sales (
                id BIGSERIAL PRIMARY KEY,
                amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
                payment_type VARCHAR(20) NOT NULL
                    CHECK (payment_type IN ('Cash', 'UPI', 'Card', 'Other')),
                description VARCHAR(250) NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                sale_date DATE NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS manual_sales_sale_date_idx
            ON public.manual_sales (sale_date)
            """
        )
        connection.execute(
            """
            ALTER TABLE public.manual_sales
            ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS public.menu_items (
                id BIGSERIAL PRIMARY KEY,
                item_key VARCHAR(100) NOT NULL UNIQUE,
                name VARCHAR(150) NOT NULL,
                category VARCHAR(100) NOT NULL,
                description VARCHAR(500) NOT NULL DEFAULT '',
                price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
                prices JSONB NOT NULL DEFAULT '[]'::jsonb,
                option_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
                icon VARCHAR(20) NOT NULL DEFAULT '🍽️',
                available BOOLEAN NOT NULL DEFAULT TRUE,
                deleted BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.execute(
            """
            ALTER TABLE public.menu_items
            ADD COLUMN IF NOT EXISTS prices JSONB
                NOT NULL DEFAULT '[]'::jsonb
            """
        )
        connection.execute(
            """
            ALTER TABLE public.menu_items
            ADD COLUMN IF NOT EXISTS option_labels JSONB
                NOT NULL DEFAULT '[]'::jsonb
            """
        )
        connection.execute(
            """
            ALTER TABLE public.menu_items
            ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE
            """
        )
        connection.execute(
            """
            ALTER TABLE public.orders
            ADD COLUMN IF NOT EXISTS customer_email VARCHAR(254)
            """
        )
        connection.execute(
            """
            ALTER TABLE public.bookings
            ADD COLUMN IF NOT EXISTS customer_email VARCHAR(254)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS public.admin_auth_state (
                admin_id SMALLINT PRIMARY KEY CHECK (admin_id = 1),
                password_hash TEXT NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS public.admin_password_reset_tokens (
                token_hash CHAR(64) PRIMARY KEY,
                expires_at TIMESTAMPTZ NOT NULL,
                used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS admin_password_reset_expiry_idx
            ON public.admin_password_reset_tokens (expires_at)
            """
        )
    yield


app = FastAPI(
    title="The Cravings Cafe API",
    description="Cafe ordering, table booking and secure administration",
    version="2.1.0",
    lifespan=lifespan,
)

def _configured_origin(value: str, variable_name: str) -> str:
    origin = value.strip().rstrip("/")
    parsed = urlsplit(origin)
    try:
        parsed.port
    except ValueError as error:
        raise RuntimeError(
            f"{variable_name} must contain an exact HTTP(S) origin, "
            "for example https://www.example.com."
        ) from error

    if (
        not origin
        or "*" in origin
        or parsed.scheme not in {"http", "https"}
        or (production and parsed.scheme != "https")
        or not parsed.netloc
        or parsed.path
        or parsed.query
        or parsed.fragment
        or parsed.username
        or parsed.password
    ):
        raise RuntimeError(
            f"{variable_name} must contain an exact HTTP(S) origin, "
            "for example https://www.example.com."
        )
    return origin


production = os.getenv("APP_ENV", "").strip().lower() == "production"
origins = []
if not production:
    origins.extend(
        ["http://localhost:5173", "http://127.0.0.1:5173"]
    )

frontend_url = os.getenv("FRONTEND_URL", "").strip()
if production and not frontend_url:
    raise RuntimeError(
        "Set FRONTEND_URL to the deployed frontend origin."
    )
if frontend_url:
    origins.append(_configured_origin(frontend_url, "FRONTEND_URL"))

origins.extend(
    _configured_origin(origin, "CORS_ORIGINS")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# -------------------- REQUEST MODELS --------------------


class OrderItem(BaseModel):
    id: str
    menu_item_id: str | None = None
    name: str
    price: float = Field(gt=0)
    quantity: int = Field(gt=0, le=100)
    variant: str | None = Field(default=None, max_length=80)
    icon: str = "🍽️"


class OrderRequest(BaseModel):
    customer_name: str = Field(min_length=1, max_length=100)
    phone: str = Field(pattern=r"^[6-9]\d{9}$")
    email: str | None = Field(
        default=None,
        max_length=254,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    order_type: str
    address: str | None = None
    items: list[OrderItem] = Field(min_length=1)


class StatusUpdate(BaseModel):
    status: str


class BookingRequest(BaseModel):
    customer_name: str = Field(min_length=1, max_length=100)
    phone: str = Field(pattern=r"^[6-9]\d{9}$")
    email: str | None = Field(
        default=None,
        max_length=254,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )
    booking_date: date
    booking_time: time
    guests: int = Field(ge=1, le=50)
    special_request: str | None = Field(default=None, max_length=500)


class BookingStatusUpdate(BaseModel):
    status: str


class AdminLoginRequest(BaseModel):
    login: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=200)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(
        min_length=3,
        max_length=254,
        pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
    )


class ResetPasswordRequest(BaseModel):
    token: str = Field(default="", max_length=512)
    new_password: str = Field(min_length=12, max_length=200)


class ReviewRequest(BaseModel):
    customer_name: str = Field(min_length=1, max_length=100)
    rating: int = Field(ge=1, le=5)
    review_text: str = Field(min_length=5, max_length=1000)


class ReviewStatusUpdate(BaseModel):
    status: str


class ManualSaleRequest(BaseModel):
    amount: float = Field(gt=0, le=1_000_000_000)
    payment_type: str = Field(min_length=1, max_length=20)
    description: str = Field(default="", max_length=250)
    notes: str = Field(default="", max_length=1000)
    sale_date: date


class MenuItemRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    category: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    price: float = Field(gt=0, le=1_000_000_000)
    prices: list[float] | None = Field(default=None, min_length=1, max_length=10)
    option_labels: list[str] = Field(default_factory=list, max_length=10)
    icon: str = Field(default="🍽️", max_length=20)
    available: bool = True


class MenuImportRequest(BaseModel):
    items: list[MenuItemRequest] = Field(min_length=1, max_length=500)



# -------------------- BASIC ENDPOINTS --------------------


@app.get("/")
def home():
    return {"message": "Welcome to The Cravings Cafe API!"}


@app.get("/health")
def health_check():
    with get_connection() as connection:
        connection.execute("SELECT 1")

    return {"status": "healthy", "database": "connected"}


# -------------------- ADMIN AUTHENTICATION --------------------


@app.post("/admin/login")
def admin_login(request: AdminLoginRequest):
    email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    username = os.getenv("ADMIN_USERNAME", "").strip().lower()

    if (
        not email
        or not username
        or len(os.getenv("SECRET_KEY", "")) < 32
    ):
        raise HTTPException(
            status_code=500,
            detail="Admin credentials are not configured on the server.",
        )

    supplied_login = request.login.strip().lower()

    if supplied_login not in {email, username}:
        raise HTTPException(
            status_code=401,
            detail="Invalid username/email or password.",
        )

    with get_connection() as connection:
        credential = connection.execute(
            """
            SELECT password_hash
            FROM public.admin_auth_state
            WHERE admin_id = 1
            """
        ).fetchone()

    stored_hash = (
        credential["password_hash"]
        if credential
        else os.getenv("ADMIN_PASSWORD_HASH", "")
    )
    if not stored_hash:
        raise HTTPException(
            status_code=500,
            detail="Admin credentials are not configured on the server.",
        )

    if not verify_password(request.password, stored_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid username/email or password.",
        )

    return {
        "access_token": create_access_token("admin"),
        "token_type": "bearer",
    }


def _is_development_environment() -> bool:
    return os.getenv("APP_ENV", "").strip().lower() in {
        "development",
        "dev",
        "local",
    }


def _smtp_is_configured() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_FROM"))


def _send_password_reset_email(recipient: str, reset_url: str) -> None:
    message = EmailMessage()
    message["Subject"] = "The Cravings Cafe admin password reset"
    message["From"] = os.environ["SMTP_FROM"]
    message["To"] = recipient
    message.set_content(
        "A password reset was requested for the cafe admin account.\n\n"
        f"Use this link within {RESET_TOKEN_LIFETIME_MINUTES} minutes:\n"
        f"{reset_url}\n\n"
        "If you did not request this reset, you can ignore this message."
    )

    host = os.environ["SMTP_HOST"]
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    use_ssl = os.getenv("SMTP_USE_SSL", "").strip().lower() in {
        "1",
        "true",
        "yes",
    }
    smtp_type = smtplib.SMTP_SSL if use_ssl else smtplib.SMTP

    with smtp_type(host, port, timeout=10) as server:
        if not use_ssl:
            server.starttls()
        if username:
            server.login(username, password)
        server.send_message(message)


@app.post("/admin/forgot-password", include_in_schema=False)
@app.post("/auth/forgot-password")
def forgot_admin_password(request: ForgotPasswordRequest):
    admin_email = os.getenv("ADMIN_EMAIL", "").strip()
    admin_username = os.getenv("ADMIN_USERNAME", "").strip()
    requested_login = request.email.strip().lower()
    is_admin = bool(admin_email and admin_username) and requested_login in {
        admin_email.lower(),
        admin_username.lower(),
    }
    development = _is_development_environment()
    smtp_configured = _smtp_is_configured()
    frontend_base_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")

    if (
        is_admin
        and (development or smtp_configured)
        and frontend_base_url
    ):
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        with get_connection() as connection:
            connection.execute(
                """
                DELETE FROM public.admin_password_reset_tokens
                WHERE used_at IS NULL
                """
            )
            connection.execute(
                """
                INSERT INTO public.admin_password_reset_tokens
                    (token_hash, expires_at)
                VALUES (
                    %s,
                    NOW() + (%s * INTERVAL '1 minute')
                )
                """,
                (token_hash, RESET_TOKEN_LIFETIME_MINUTES),
            )

        reset_url = (
            f"{frontend_base_url}/reset-password?"
            f"{urlencode({'token': raw_token})}"
        )

        if smtp_configured:
            try:
                _send_password_reset_email(admin_email, reset_url)
            except (OSError, smtplib.SMTPException, ValueError):
                logger.exception("Admin password reset email delivery failed")

        if development:
            return {
                "message": RESET_GENERIC_MESSAGE,
                "reset_url": reset_url,
                "expires_in_minutes": RESET_TOKEN_LIFETIME_MINUTES,
            }

    return {"message": RESET_GENERIC_MESSAGE}


@app.post("/admin/reset-password", include_in_schema=False)
@app.post("/auth/reset-password")
def reset_admin_password(request: ResetPasswordRequest):
    if (
        len(request.token) != 43
        or not all(
            character.isalnum() or character in "-_"
            for character in request.token
        )
    ):
        raise HTTPException(status_code=400, detail=RESET_INVALID_MESSAGE)

    token_hash = hashlib.sha256(request.token.encode("utf-8")).hexdigest()
    password_hash = hash_password(request.new_password)

    with get_connection() as connection:
        with connection.transaction():
            valid_token = connection.execute(
                """
                UPDATE public.admin_password_reset_tokens
                SET used_at = NOW()
                WHERE token_hash = %s
                  AND used_at IS NULL
                  AND expires_at > NOW()
                RETURNING token_hash
                """,
                (token_hash,),
            ).fetchone()

            if not valid_token:
                raise HTTPException(status_code=400, detail=RESET_INVALID_MESSAGE)

            connection.execute(
                """
                INSERT INTO public.admin_auth_state
                    (admin_id, password_hash, updated_at)
                VALUES (1, %s, NOW())
                ON CONFLICT (admin_id)
                DO UPDATE SET password_hash = EXCLUDED.password_hash,
                              updated_at = NOW()
                """,
                (password_hash,),
            )
            connection.execute(
                """
                UPDATE public.admin_password_reset_tokens
                SET used_at = NOW()
                WHERE used_at IS NULL
                """
            )

    return {"message": "Admin password reset successfully."}


# -------------------- CUSTOMER ORDERS --------------------


@app.post("/orders", status_code=201)
def create_order(order: OrderRequest):
    if order.order_type not in ("Pickup", "Delivery"):
        raise HTTPException(
            status_code=400,
            detail="Order type must be Pickup or Delivery.",
        )

    if order.order_type == "Delivery" and not (
        order.address and order.address.strip()
    ):
        raise HTTPException(
            status_code=400,
            detail="A delivery address is required.",
        )

    total = round(
        sum(item.price * item.quantity for item in order.items), 2
    )
    order_number = "CC-" + uuid4().hex[:8].upper()
    items_data = [item.model_dump() for item in order.items]

    with get_connection() as connection:
        managed_items = {}
        menu_item_ids = [
            item.menu_item_id for item in order.items if item.menu_item_id
        ]
        if menu_item_ids:
            rows = connection.execute(
                """
                SELECT item_key, price, prices, available, deleted
                FROM public.menu_items
                WHERE item_key = ANY(%s::varchar[])
                """,
                (menu_item_ids,),
            ).fetchall()
            managed_items = {row["item_key"]: row for row in rows}

        for item in order.items:
            if not item.menu_item_id:
                continue
            managed_item = managed_items.get(item.menu_item_id)
            if not managed_item:
                raise HTTPException(
                    status_code=400,
                    detail=f"{item.name} is no longer available in the menu.",
                )
            if not managed_item["available"] or managed_item["deleted"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"{item.name} is currently unavailable.",
                )
            valid_prices = managed_item["prices"] or [
                float(managed_item["price"])
            ]
            if not any(
                round(item.price, 2) == round(float(price), 2)
                for price in valid_prices
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"The price for {item.name} has changed. Refresh the menu.",
                )

        connection.execute(
            """
            INSERT INTO public.orders (
                order_number, customer_name, phone, customer_email, order_type,
                address, items, total_amount, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                order_number,
                order.customer_name.strip(),
                order.phone,
                order.email.strip() if order.email else None,
                order.order_type,
                order.address.strip() if order.address else None,
                Jsonb(items_data),
                total,
                "Pending",
            ),
        )

    return {
        "message": "Order saved successfully.",
        "order_number": order_number,
        "total": total,
        "status": "Pending",
    }


@app.get("/orders")
@app.get("/admin/orders")
def list_orders(admin: dict = Depends(require_admin)):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, order_number, customer_name, phone,
                   customer_email, order_type, address, items, total_amount,
                   status, created_at
            FROM public.orders
            ORDER BY id DESC
            """
        ).fetchall()

    return [
        {
            **row,
            "total": float(row["total_amount"]),
            "items": row["items"],
        }
        for row in rows
    ]


@app.get("/admin/orders/{order_number}")
def get_order(
    order_number: str,
    admin: dict = Depends(require_admin),
):
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, order_number, customer_name, phone,
                   customer_email, order_type, address, items, total_amount,
                   status, created_at
            FROM public.orders
            WHERE order_number = %s
            """,
            (order_number,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Order not found.")

    return {**row, "total": float(row["total_amount"])}


@app.patch("/orders/{order_number}/status")
@app.patch("/admin/orders/{order_number}")
@app.patch("/admin/orders/{order_number}/status")
def update_order_status(
    order_number: str,
    update: StatusUpdate,
    admin: dict = Depends(require_admin),
):
    if update.status not in ORDER_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Status must be one of: " + ", ".join(ORDER_STATUSES),
        )

    with get_connection() as connection:
        row = connection.execute(
            """
            UPDATE public.orders
            SET status = %s
            WHERE order_number = %s
            RETURNING order_number
            """,
            (update.status, order_number),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Order not found.")

    return {
        "message": "Order status updated.",
        "order_number": order_number,
        "status": update.status,
    }


# -------------------- TABLE BOOKINGS --------------------


@app.post("/bookings", status_code=201)
def create_booking(booking: BookingRequest):
    customer_name = booking.customer_name.strip()
    if not customer_name:
        raise HTTPException(
            status_code=422,
            detail="Please enter your name.",
        )

    booking_number = "BK-" + uuid4().hex[:8].upper()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO public.bookings (
                booking_number, customer_name, phone, customer_email, booking_date,
                booking_time, guests, special_request, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                booking_number,
                customer_name,
                booking.phone,
                booking.email.strip() if booking.email else None,
                booking.booking_date,
                booking.booking_time.strftime("%H:%M"),
                booking.guests,
                booking.special_request.strip()
                if booking.special_request
                and booking.special_request.strip()
                else None,
                "Pending",
            ),
        )

    return {
        "message": "Table booking saved successfully.",
        "booking_number": booking_number,
        "booking_date": booking.booking_date.isoformat(),
        "booking_time": booking.booking_time.strftime("%H:%M"),
        "guests": booking.guests,
        "status": "Pending",
    }


@app.get("/bookings")
@app.get("/admin/bookings")
def list_bookings(admin: dict = Depends(require_admin)):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, booking_number, customer_name, phone,
                   customer_email, booking_date, booking_time, guests,
                   special_request, status, created_at
            FROM public.bookings
            ORDER BY booking_date DESC, booking_time DESC, id DESC
            """
        ).fetchall()

    return [
        {
            **row,
            "booking_date": row["booking_date"].isoformat(),
            "booking_time": str(row["booking_time"]),
        }
        for row in rows
    ]


@app.patch("/bookings/{booking_number}/status")
@app.patch("/admin/bookings/{booking_number}")
@app.patch("/admin/bookings/{booking_number}/status")
def update_booking_status(
    booking_number: str,
    update: BookingStatusUpdate,
    admin: dict = Depends(require_admin),
):
    if update.status not in BOOKING_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Status must be one of: "
            + ", ".join(BOOKING_STATUSES),
        )

    with get_connection() as connection:
        row = connection.execute(
            """
            UPDATE public.bookings
            SET status = %s
            WHERE booking_number = %s
            RETURNING booking_number
            """,
            (update.status, booking_number),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Booking not found.")

    return {
        "message": "Booking status updated.",
        "booking_number": booking_number,
        "status": update.status,
    }


# -------------------- ADMIN SUMMARY --------------------


@app.get("/admin/summary")
@app.get("/admin/dashboard")
def admin_summary(
    sale_date: date | None = None,
    admin: dict = Depends(require_admin),
):
    selected_date = sale_date or date.today()
    with get_connection() as connection:
        order_stats = connection.execute(
            """
            SELECT
                COUNT(*) AS total_orders,
                COUNT(*) FILTER (
                    WHERE status = 'Pending'
                ) AS pending_orders,
                COUNT(*) FILTER (
                    WHERE status IN (
                        'Pending', 'Confirmed', 'Preparing', 'Ready'
                    )
                ) AS active_orders,
                COUNT(*) FILTER (
                    WHERE status = 'Completed'
                ) AS completed_orders,
                COALESCE(
                    SUM(total_amount) FILTER (
                        WHERE status = 'Completed'
                    ), 0
                ) AS completed_sales,
                COALESCE(
                    SUM(total_amount) FILTER (
                        WHERE status != 'Cancelled'
                    ), 0
                ) AS non_cancelled_order_value
            FROM public.orders
            """
        ).fetchone()

        booking_stats = connection.execute(
            """
            SELECT
                COUNT(*) AS total_bookings,
                COUNT(*) FILTER (
                    WHERE status = 'Pending'
                ) AS pending_bookings,
                COUNT(*) FILTER (
                    WHERE status = 'Confirmed'
                ) AS confirmed_bookings
            FROM public.bookings
            """
        ).fetchone()

        today_stats = connection.execute(
            """
            SELECT
                COUNT(*) FILTER (
                    WHERE status != 'Cancelled'
                ) AS today_orders,
                COALESCE(
                    SUM(total_amount) FILTER (
                        WHERE status = 'Completed'
                    ), 0
                ) AS today_sales
            FROM public.orders
            WHERE created_at::date = %s
            """,
            (selected_date,),
        ).fetchone()

        today_booking_count = connection.execute(
            """
            SELECT COUNT(*) AS today_bookings
            FROM public.bookings
            WHERE booking_date = %s
            """,
            (selected_date,),
        ).fetchone()

        customer_stats = connection.execute(
            """
            SELECT COUNT(DISTINCT phone) AS total_customers
            FROM (
                SELECT phone FROM public.orders
                UNION
                SELECT phone FROM public.bookings
            ) AS customer_phones
            """
        ).fetchone()

        review_stats = connection.execute(
            """
            SELECT COUNT(*) AS total_reviews,
                   COALESCE(
                       AVG(rating) FILTER (WHERE status = 'Approved'),
                       0
                   ) AS average_rating
            FROM public.reviews
            """
        ).fetchone()

    return {
        **order_stats,
        **booking_stats,
        **today_stats,
        **today_booking_count,
        **customer_stats,
        "total_reviews": int(review_stats["total_reviews"]),
        "average_rating": float(review_stats["average_rating"]),
        "completed_sales": float(order_stats["completed_sales"]),
        "today_sales": float(today_stats["today_sales"]),
        "non_cancelled_order_value": float(
            order_stats["non_cancelled_order_value"]
        ),
    }


@app.get("/admin/customers")
def list_customers(admin: dict = Depends(require_admin)):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                phone,
                (ARRAY_AGG(customer_name ORDER BY activity_at DESC))[1]
                    AS customer_name,
                COUNT(*) FILTER (WHERE activity_type = 'order')
                    AS order_count,
                COALESCE(
                    SUM(amount) FILTER (WHERE activity_type = 'order'),
                    0
                ) AS total_spent,
                MAX(activity_at) FILTER (WHERE activity_type = 'order')
                    AS last_order_date
            FROM (
                SELECT customer_name, phone,
                       CASE WHEN status = 'Completed'
                            THEN total_amount ELSE 0::numeric END AS amount,
                       created_at AS activity_at, 'order' AS activity_type
                FROM public.orders
                WHERE status != 'Cancelled'
                UNION ALL
                SELECT customer_name, phone, 0::numeric AS amount,
                       created_at AS activity_at, 'booking' AS activity_type
                FROM public.bookings
            ) AS customer_activity
            GROUP BY phone
            ORDER BY customer_name
            """
        ).fetchall()

    return [
        {
            **row,
            "total_spent": float(row["total_spent"]),
            "last_order_date": (
                row["last_order_date"].isoformat()
                if row["last_order_date"]
                else None
            ),
        }
        for row in rows
    ]


def _get_sales_summary(connection, sale_date: date):
    online = connection.execute(
        """
        SELECT COUNT(*) FILTER (
                   WHERE status != 'Cancelled'
               ) AS order_count,
               COALESCE(
                   SUM(total_amount) FILTER (
                       WHERE status = 'Completed'
                   ), 0
               ) AS online_orders_total
        FROM public.orders
        WHERE created_at::date = %s
        """,
        (sale_date,),
    ).fetchone()
    manual_rows = connection.execute(
        """
        SELECT payment_type, COALESCE(SUM(amount), 0) AS amount
        FROM public.manual_sales
        WHERE sale_date = %s
        GROUP BY payment_type
        """,
        (sale_date,),
    ).fetchall()

    online_total = float(online["online_orders_total"])
    manual_sales_by_payment = {
        payment_type: 0.0
        for payment_type in ("Cash", "UPI", "Card", "Other")
    }
    for row in manual_rows:
        manual_sales_by_payment[row["payment_type"]] = float(row["amount"])
    manual_total = sum(manual_sales_by_payment.values())

    def period_total(start_date: date, end_date: date) -> float:
        row = connection.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM (
                SELECT total_amount AS amount
                FROM public.orders
                WHERE created_at::date >= %s AND created_at::date < %s
                  AND status = 'Completed'
                UNION ALL
                SELECT amount
                FROM public.manual_sales
                WHERE sale_date >= %s AND sale_date < %s
            ) AS recorded_sales
            """,
            (start_date, end_date, start_date, end_date),
        ).fetchone()
        return float(row["total"])

    week_start = sale_date - timedelta(days=sale_date.weekday())
    month_start = sale_date.replace(day=1)
    month_end = (
        date(sale_date.year + 1, 1, 1)
        if sale_date.month == 12
        else date(sale_date.year, sale_date.month + 1, 1)
    )

    return {
        "sale_date": sale_date.isoformat(),
        "order_count": online["order_count"],
        "online_orders_total": online_total,
        "manual_sales_total": manual_total,
        "manual_sales_by_payment": manual_sales_by_payment,
        "total_sales": online_total + manual_total,
        "weekly_sales_total": period_total(
            week_start, week_start + timedelta(days=7)
        ),
        "monthly_sales_total": period_total(month_start, month_end),
    }


def _get_period_sales(connection, start_date: date, end_date: date):
    online_rows = connection.execute(
        """
        SELECT created_at::date AS sale_date,
               COUNT(*) FILTER (
                   WHERE status != 'Cancelled'
               ) AS order_count,
               COALESCE(
                   SUM(total_amount) FILTER (
                       WHERE status = 'Completed'
                   ), 0
               ) AS online_sales
        FROM public.orders
        WHERE created_at::date >= %s
          AND created_at::date < %s
        GROUP BY created_at::date
        """,
        (start_date, end_date),
    ).fetchall()
    manual_rows = connection.execute(
        """
        SELECT sale_date,
               payment_type,
               COALESCE(SUM(amount), 0) AS manual_sales
        FROM public.manual_sales
        WHERE sale_date >= %s AND sale_date < %s
        GROUP BY sale_date, payment_type
        """,
        (start_date, end_date),
    ).fetchall()

    daily = {}
    for row in online_rows:
        day = row["sale_date"]
        daily[day] = {
            "sale_date": day.isoformat(),
            "order_count": row["order_count"],
            "online_sales": float(row["online_sales"]),
            "manual_sales": 0.0,
            "manual_sales_by_payment": {
                payment_type: 0.0
                for payment_type in ("Cash", "UPI", "Card", "Other")
            },
        }
    for row in manual_rows:
        day = row["sale_date"]
        daily.setdefault(
            day,
            {
                "sale_date": day.isoformat(),
                "order_count": 0,
                "online_sales": 0.0,
                "manual_sales": 0.0,
                "manual_sales_by_payment": {
                    payment_type: 0.0
                    for payment_type in ("Cash", "UPI", "Card", "Other")
                },
            },
        )
        amount = float(row["manual_sales"])
        daily[day]["manual_sales"] += amount
        daily[day]["manual_sales_by_payment"][row["payment_type"]] += amount

    for row in daily.values():
        row["total_sales"] = row["online_sales"] + row["manual_sales"]
    day = start_date
    while day < end_date:
        daily.setdefault(
            day,
            {
                "sale_date": day.isoformat(),
                "order_count": 0,
                "online_sales": 0.0,
                "manual_sales": 0.0,
                "manual_sales_by_payment": {
                    payment_type: 0.0
                    for payment_type in ("Cash", "UPI", "Card", "Other")
                },
                "total_sales": 0.0,
            },
        )
        day += timedelta(days=1)
    return sorted(daily.values(), key=lambda row: row["sale_date"])


@app.get("/admin/sales")
@app.get("/admin/manual-sales")
def list_sales(
    sale_date: date | None = None,
    admin: dict = Depends(require_admin),
):
    selected_date = sale_date or date.today()
    with get_connection() as connection:
        summary = _get_sales_summary(connection, selected_date)
        rows = connection.execute(
            """
            SELECT id, amount, payment_type, description, sale_date,
                       notes, created_at, updated_at
            FROM public.manual_sales
            WHERE sale_date = %s
            ORDER BY created_at DESC, id DESC
            """,
            (selected_date,),
        ).fetchall()

    summary["manual_sales"] = [
        {
            **row,
            "amount": float(row["amount"]),
            "sale_date": row["sale_date"].isoformat(),
            "created_at": row["created_at"].isoformat(),
            "updated_at": row["updated_at"].isoformat(),
        }
        for row in rows
    ]
    return summary


@app.post("/admin/sales", status_code=201)
@app.post("/admin/manual-sales", status_code=201)
def create_sale(
    sale: ManualSaleRequest,
    admin: dict = Depends(require_admin),
):
    if sale.payment_type not in ("Cash", "UPI", "Card", "Other"):
        raise HTTPException(
            status_code=422,
            detail="Payment type must be Cash, UPI, Card, or Other.",
        )
    with get_connection() as connection:
        row = connection.execute(
            """
            INSERT INTO public.manual_sales
                (amount, payment_type, description, notes, sale_date)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, amount, payment_type, description, sale_date,
                      notes, created_at, updated_at
            """,
            (
                sale.amount,
                sale.payment_type,
                sale.description.strip(),
                sale.notes.strip(),
                sale.sale_date,
            ),
        ).fetchone()

    return {
        **row,
        "amount": float(row["amount"]),
        "sale_date": row["sale_date"].isoformat(),
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
    }


@app.patch("/admin/sales/{sale_id}")
@app.patch("/admin/manual-sales/{sale_id}")
@app.put("/admin/manual-sales/{sale_id}")
def update_sale(
    sale_id: int,
    sale: ManualSaleRequest,
    admin: dict = Depends(require_admin),
):
    if sale.payment_type not in ("Cash", "UPI", "Card", "Other"):
        raise HTTPException(
            status_code=422,
            detail="Payment type must be Cash, UPI, Card, or Other.",
        )
    with get_connection() as connection:
        row = connection.execute(
            """
            UPDATE public.manual_sales
            SET amount = %s, payment_type = %s, description = %s,
                notes = %s, sale_date = %s, updated_at = NOW()
            WHERE id = %s
            RETURNING id, amount, payment_type, description, sale_date,
                      notes, created_at, updated_at
            """,
            (
                sale.amount,
                sale.payment_type,
                sale.description.strip(),
                sale.notes.strip(),
                sale.sale_date,
                sale_id,
            ),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Sale not found.")

    return {
        **row,
        "amount": float(row["amount"]),
        "sale_date": row["sale_date"].isoformat(),
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
    }


@app.delete("/admin/sales/{sale_id}")
@app.delete("/admin/manual-sales/{sale_id}")
def delete_sale(
    sale_id: int,
    admin: dict = Depends(require_admin),
):
    with get_connection() as connection:
        row = connection.execute(
            """
            DELETE FROM public.manual_sales
            WHERE id = %s
            RETURNING id
            """,
            (sale_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Sale not found.")

    return {"message": "Manual sale deleted.", "id": row["id"]}


@app.get("/admin/sales/daily")
def daily_sales_summary(
    sale_date: date | None = None,
    admin: dict = Depends(require_admin),
):
    selected_date = sale_date or date.today()
    with get_connection() as connection:
        return _get_sales_summary(connection, selected_date)


@app.get("/admin/sales/weekly")
def weekly_sales_summary(
    sale_date: date | None = None,
    admin: dict = Depends(require_admin),
):
    selected_date = sale_date or date.today()
    week_start = selected_date - timedelta(days=selected_date.weekday())
    week_end = week_start + timedelta(days=7)
    with get_connection() as connection:
        daily = _get_period_sales(connection, week_start, week_end)

    return {
        "week_start": week_start.isoformat(),
        "week_end": (week_end - timedelta(days=1)).isoformat(),
        "days": daily,
        "order_count": sum(row["order_count"] for row in daily),
        "online_sales_total": sum(row["online_sales"] for row in daily),
        "manual_sales_total": sum(row["manual_sales"] for row in daily),
        "total_sales": sum(row["total_sales"] for row in daily),
    }


@app.get("/admin/sales/monthly")
def monthly_sales_summary(
    sale_date: date | None = None,
    admin: dict = Depends(require_admin),
):
    selected_date = sale_date or date.today()
    month_start = selected_date.replace(day=1)
    month_end = (
        date(selected_date.year + 1, 1, 1)
        if selected_date.month == 12
        else date(selected_date.year, selected_date.month + 1, 1)
    )
    with get_connection() as connection:
        daily = _get_period_sales(connection, month_start, month_end)

    payment_totals = {
        payment_type: sum(
            row["manual_sales_by_payment"][payment_type]
            for row in daily
        )
        for payment_type in ("Cash", "UPI", "Card", "Other")
    }
    online_total = sum(row["online_sales"] for row in daily)
    manual_total = sum(row["manual_sales"] for row in daily)

    return {
        "month": month_start.strftime("%Y-%m"),
        "order_count": sum(row["order_count"] for row in daily),
        "online_sales_total": online_total,
        "manual_sales_total": manual_total,
        "total_sales": online_total + manual_total,
        "payment_breakdown": payment_totals,
    }


@app.get("/menu")
def list_menu():
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT item_key, name, category, description, price,
                   prices, option_labels, icon, available, deleted
            FROM public.menu_items
            ORDER BY category, name
            """
        ).fetchall()
    return [
        {
            **row,
            "price": float(row["price"]),
            "prices": row["prices"] or [float(row["price"])],
            "option_labels": row["option_labels"] or [],
        }
        for row in rows
    ]


@app.get("/admin/menu")
def list_admin_menu(admin: dict = Depends(require_admin)):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT item_key, name, category, description, price,
                   prices, option_labels, icon, available,
                   created_at, updated_at
            FROM public.menu_items
            WHERE deleted = FALSE
            ORDER BY category, name
            """
        ).fetchall()
    return [
        {
            **row,
            "price": float(row["price"]),
            "prices": row["prices"] or [float(row["price"])],
            "option_labels": row["option_labels"] or [],
            "created_at": row["created_at"].isoformat(),
            "updated_at": row["updated_at"].isoformat(),
        }
        for row in rows
    ]


def _menu_item_values(item: MenuItemRequest):
    name = item.name.strip()
    category = item.category.strip()
    if not name or not category:
        raise HTTPException(
            status_code=422,
            detail="Menu item name and category are required.",
        )
    prices = item.prices or [item.price]
    if any(price <= 0 or price > 1_000_000_000 for price in prices):
        raise HTTPException(
            status_code=422,
            detail="Every menu price must be greater than zero.",
        )
    return (
        name,
        category,
        item.description.strip(),
        prices[0],
        Jsonb(prices),
        Jsonb(item.option_labels),
        item.icon.strip() or "🍽️",
        item.available,
    )


@app.post("/admin/menu", status_code=201)
def create_menu_item(
    item: MenuItemRequest,
    admin: dict = Depends(require_admin),
):
    values = _menu_item_values(item)
    item_key = uuid4().hex
    with get_connection() as connection:
        row = connection.execute(
            """
            INSERT INTO public.menu_items
                (item_key, name, category, description, price, prices,
                 option_labels, icon, available)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING item_key, name, category, description, price,
                      prices, option_labels, icon, available,
                      created_at, updated_at
            """,
            (item_key, *values),
        ).fetchone()
    return {
        **row,
        "price": float(row["price"]),
        "prices": row["prices"] or [float(row["price"])],
        "option_labels": row["option_labels"] or [],
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
    }


@app.patch("/admin/menu/{item_key}")
@app.put("/admin/menu/{item_key}")
def update_menu_item(
    item_key: str,
    item: MenuItemRequest,
    admin: dict = Depends(require_admin),
):
    values = _menu_item_values(item)
    with get_connection() as connection:
        row = connection.execute(
            """
            UPDATE public.menu_items
            SET name = %s, category = %s, description = %s, price = %s,
                prices = %s, option_labels = %s, icon = %s,
                available = %s, updated_at = NOW()
            WHERE item_key = %s AND deleted = FALSE
            RETURNING item_key, name, category, description, price,
                      prices, option_labels, icon, available,
                      created_at, updated_at
            """,
            (*values, item_key),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Menu item not found.")
    return {
        **row,
        "price": float(row["price"]),
        "prices": row["prices"] or [float(row["price"])],
        "option_labels": row["option_labels"] or [],
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
    }


@app.delete("/admin/menu/{item_key}")
def delete_menu_item(
    item_key: str,
    admin: dict = Depends(require_admin),
):
    with get_connection() as connection:
        row = connection.execute(
            """
            UPDATE public.menu_items
            SET deleted = TRUE, available = FALSE, updated_at = NOW()
            WHERE item_key = %s AND deleted = FALSE
            RETURNING item_key
            """,
            (item_key,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Menu item not found.")
    return {"message": "Menu item deleted.", "item_key": row["item_key"]}


@app.post("/admin/menu/import-existing")
def import_existing_menu(
    request: MenuImportRequest,
    admin: dict = Depends(require_admin),
):
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT COUNT(*) AS item_count FROM public.menu_items"
        ).fetchone()
        if existing["item_count"]:
            raise HTTPException(
                status_code=409,
                detail="The managed menu is already populated.",
            )

        imported = 0
        for item in request.items:
            values = _menu_item_values(item)
            connection.execute(
                """
                INSERT INTO public.menu_items
                    (item_key, name, category, description, price, prices,
                     option_labels, icon, available)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (uuid4().hex, *values),
            )
            imported += 1

    return {
        "message": "Existing customer menu imported.",
        "imported_items": imported,
    }


# -------------------- CUSTOMER REVIEWS --------------------

@app.post("/reviews", status_code=201)
def create_review(review: ReviewRequest):
    customer_name = review.customer_name.strip()
    review_text = review.review_text.strip()

    if not customer_name or not (5 <= len(review_text) <= 1000):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid name and review.",
        )

    with get_connection() as connection:
        row = connection.execute(
            """
            INSERT INTO public.reviews
                (customer_name, rating, review_text, status)
            VALUES (%s, %s, %s, 'Pending')
            RETURNING id
            """,
            (customer_name, review.rating, review_text),
        ).fetchone()

    return {
        "message": "Thank you! Your review is awaiting admin approval.",
        "id": row["id"],
        "status": "Pending",
    }


@app.get("/reviews")
def list_public_reviews():
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, customer_name, rating, review_text, created_at
            FROM public.reviews
            WHERE status = 'Approved'
            ORDER BY created_at DESC
            """
        ).fetchall()

    return [
        {
            **row,
            "created_at": row["created_at"].isoformat(),
        }
        for row in rows
    ]


@app.get("/admin/reviews")
def list_admin_reviews(admin: dict = Depends(require_admin)):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, customer_name, rating, review_text,
                   status, created_at
            FROM public.reviews
            ORDER BY
                CASE WHEN status = 'Pending' THEN 0 ELSE 1 END,
                created_at DESC
            """
        ).fetchall()

    return [
        {
            **row,
            "created_at": row["created_at"].isoformat(),
        }
        for row in rows
    ]


@app.patch("/admin/reviews/{review_id}")
def update_review_status(
    review_id: int,
    update: ReviewStatusUpdate,
    admin: dict = Depends(require_admin),
):
    if update.status not in ("Approved", "Rejected"):
        raise HTTPException(
            status_code=400,
            detail="Status must be Approved or Rejected.",
        )

    with get_connection() as connection:
        row = connection.execute(
            """
            UPDATE public.reviews
            SET status = %s
            WHERE id = %s
            RETURNING id, status
            """,
            (update.status, review_id),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Review not found.")

    return {
        "message": "Review status updated.",
        "id": row["id"],
        "status": row["status"],
    }


@app.delete("/admin/reviews/{review_id}")
def delete_review(
    review_id: int,
    admin: dict = Depends(require_admin),
):
    with get_connection() as connection:
        row = connection.execute(
            """
            DELETE FROM public.reviews
            WHERE id = %s
            RETURNING id
            """,
            (review_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Review not found.")

    return {"message": "Review deleted.", "id": row["id"]}
