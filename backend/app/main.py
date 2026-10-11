
import os
from contextlib import asynccontextmanager
from datetime import date, time
from pathlib import Path
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
    require_admin,
    verify_password,
)

# -------------------- CONFIGURATION --------------------

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

ORDER_STATUSES = [
    "Pending",
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
        sslmode="require",
        row_factory=dict_row,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    with get_connection() as connection:
        connection.execute("SELECT 1")
    yield


app = FastAPI(
    title="The Cravings Cafe API",
    description="Cafe ordering, table booking and secure administration",
    version="2.1.0",
    lifespan=lifespan,
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- REQUEST MODELS --------------------


class OrderItem(BaseModel):
    id: str
    name: str
    price: float = Field(gt=0)
    quantity: int = Field(gt=0, le=100)
    icon: str = "🍽️"


class OrderRequest(BaseModel):
    customer_name: str = Field(min_length=1, max_length=100)
    phone: str = Field(pattern=r"^[6-9]\d{9}$")
    order_type: str
    address: str | None = None
    items: list[OrderItem] = Field(min_length=1)


class StatusUpdate(BaseModel):
    status: str


class BookingRequest(BaseModel):
    customer_name: str = Field(min_length=1, max_length=100)
    phone: str = Field(pattern=r"^[6-9]\d{9}$")
    booking_date: date
    booking_time: time
    guests: int = Field(ge=1, le=50)
    special_request: str | None = Field(default=None, max_length=500)


class BookingStatusUpdate(BaseModel):
    status: str


class AdminLoginRequest(BaseModel):
    login: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=200)


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
    stored_hash = os.getenv("ADMIN_PASSWORD_HASH", "")

    if not email or not username or not stored_hash:
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

    if not verify_password(request.password, stored_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid username/email or password.",
        )

    return {
        "access_token": create_access_token("admin"),
        "token_type": "bearer",
    }


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
        connection.execute(
            """
            INSERT INTO public.orders (
                order_number, customer_name, phone, order_type,
                address, items, total_amount, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                order_number,
                order.customer_name.strip(),
                order.phone,
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
def list_orders(admin: dict = Depends(require_admin)):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, order_number, customer_name, phone,
                   order_type, address, items, total_amount,
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


@app.patch("/orders/{order_number}/status")
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
    booking_number = "BK-" + uuid4().hex[:8].upper()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO public.bookings (
                booking_number, customer_name, phone, booking_date,
                booking_time, guests, special_request, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                booking_number,
                booking.customer_name.strip(),
                booking.phone,
                booking.booking_date,
                booking.booking_time.strftime("%H:%M"),
                booking.guests,
                booking.special_request,
                "Pending",
            ),
        )

    return {
        "message": "Table booking saved successfully.",
        "booking_number": booking_number,
        "status": "Pending",
    }


@app.get("/bookings")
def list_bookings(admin: dict = Depends(require_admin)):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, booking_number, customer_name, phone,
                   booking_date, booking_time, guests,
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
def admin_summary(admin: dict = Depends(require_admin)):
    with get_connection() as connection:
        order_stats = connection.execute(
            """
            SELECT
                COUNT(*) AS total_orders,
                COUNT(*) FILTER (
                    WHERE status = 'Pending'
                ) AS pending_orders,
                COUNT(*) FILTER (
                    WHERE status IN ('Pending', 'Preparing', 'Ready')
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

    return {
        **order_stats,
        **booking_stats,
        "completed_sales": float(order_stats["completed_sales"]),
        "non_cancelled_order_value": float(
            order_stats["non_cancelled_order_value"]
        ),
    }
