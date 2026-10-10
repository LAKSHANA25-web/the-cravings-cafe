
from contextlib import asynccontextmanager
from datetime import date, time
from pathlib import Path
import json
import sqlite3
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "cafe.db"

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


def initialize_database():
    with sqlite3.connect(DB_PATH) as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT UNIQUE NOT NULL,
                customer_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                order_type TEXT NOT NULL,
                address TEXT,
                items TEXT NOT NULL,
                total REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'Pending',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_number TEXT UNIQUE NOT NULL,
                customer_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                booking_date TEXT NOT NULL,
                booking_time TEXT NOT NULL,
                guests INTEGER NOT NULL,
                special_request TEXT,
                status TEXT NOT NULL DEFAULT 'Pending',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="The Cravings Cafe API",
    description="Cafe ordering, table booking and administration API",
    version="1.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
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
    special_request: str | None = Field(
        default=None,
        max_length=500,
    )


class BookingStatusUpdate(BaseModel):
    status: str


# -------------------- BASIC ENDPOINTS --------------------

@app.get("/")
def home():
    return {"message": "Welcome to The Cravings Cafe API!"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


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

    total = sum(
        item.price * item.quantity for item in order.items
    )
    order_number = "CC-" + uuid4().hex[:8].upper()

    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            INSERT INTO orders (
                order_number, customer_name, phone,
                order_type, address, items, total, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                order_number,
                order.customer_name.strip(),
                order.phone,
                order.order_type,
                order.address.strip() if order.address else None,
                json.dumps([
                    item.model_dump() for item in order.items
                ]),
                total,
                "Pending",
            ),
        )

    return {
        "message": "Order saved successfully.",
        "order_number": order_number,
        "total": round(total, 2),
        "status": "Pending",
    }


@app.get("/orders")
def list_orders():
    with sqlite3.connect(DB_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT id, order_number, customer_name, phone,
                   order_type, address, items, total,
                   status, created_at
            FROM orders
            ORDER BY id DESC
            """
        ).fetchall()

    return [
        {
            **dict(row),
            "items": json.loads(row["items"]),
        }
        for row in rows
    ]


@app.patch("/orders/{order_number}/status")
def update_order_status(
    order_number: str,
    update: StatusUpdate,
):
    if update.status not in ORDER_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Status must be one of: {', '.join(ORDER_STATUSES)}",
        )

    with sqlite3.connect(DB_PATH) as connection:
        cursor = connection.execute(
            """
            UPDATE orders
            SET status = ?
            WHERE order_number = ?
            """,
            (update.status, order_number),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Order not found.",
            )

    return {
        "message": "Order status updated.",
        "order_number": order_number,
        "status": update.status,
    }


# -------------------- TABLE BOOKINGS --------------------

@app.post("/bookings", status_code=201)
def create_booking(booking: BookingRequest):
    if booking.booking_date < date.today():
        raise HTTPException(
            status_code=400,
            detail="Booking date cannot be in the past.",
        )

    booking_number = "BK-" + uuid4().hex[:8].upper()

    with sqlite3.connect(DB_PATH) as connection:
        connection.execute(
            """
            INSERT INTO bookings (
                booking_number, customer_name, phone,
                booking_date, booking_time, guests,
                special_request, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                booking_number,
                booking.customer_name.strip(),
                booking.phone,
                booking.booking_date.isoformat(),
                booking.booking_time.strftime("%H:%M"),
                booking.guests,
                booking.special_request.strip()
                if booking.special_request
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
def list_bookings():
    with sqlite3.connect(DB_PATH) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT id, booking_number, customer_name, phone,
                   booking_date, booking_time, guests,
                   special_request, status, created_at
            FROM bookings
            ORDER BY booking_date DESC, booking_time DESC, id DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]


@app.patch("/bookings/{booking_number}/status")
def update_booking_status(
    booking_number: str,
    update: BookingStatusUpdate,
):
    if update.status not in BOOKING_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Status must be one of: "
                + ", ".join(BOOKING_STATUSES)
            ),
        )

    with sqlite3.connect(DB_PATH) as connection:
        cursor = connection.execute(
            """
            UPDATE bookings
            SET status = ?
            WHERE booking_number = ?
            """,
            (update.status, booking_number),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Booking not found.",
            )

    return {
        "message": "Booking status updated.",
        "booking_number": booking_number,
        "status": update.status,
    }


# -------------------- ADMIN SUMMARY --------------------

@app.get("/admin/summary")
def admin_summary():
    with sqlite3.connect(DB_PATH) as connection:
        total_orders = connection.execute(
            "SELECT COUNT(*) FROM orders"
        ).fetchone()[0]

        pending_orders = connection.execute(
            "SELECT COUNT(*) FROM orders WHERE status = 'Pending'"
        ).fetchone()[0]

        active_orders = connection.execute(
            """
            SELECT COUNT(*) FROM orders
            WHERE status IN ('Pending', 'Preparing', 'Ready')
            """
        ).fetchone()[0]

        completed_orders = connection.execute(
            "SELECT COUNT(*) FROM orders WHERE status = 'Completed'"
        ).fetchone()[0]

        completed_sales = connection.execute(
            """
            SELECT COALESCE(SUM(total), 0)
            FROM orders
            WHERE status = 'Completed'
            """
        ).fetchone()[0]

        all_order_value = connection.execute(
            """
            SELECT COALESCE(SUM(total), 0)
            FROM orders
            WHERE status != 'Cancelled'
            """
        ).fetchone()[0]

        total_bookings = connection.execute(
            "SELECT COUNT(*) FROM bookings"
        ).fetchone()[0]

        pending_bookings = connection.execute(
            "SELECT COUNT(*) FROM bookings WHERE status = 'Pending'"
        ).fetchone()[0]

        confirmed_bookings = connection.execute(
            "SELECT COUNT(*) FROM bookings WHERE status = 'Confirmed'"
        ).fetchone()[0]

    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "active_orders": active_orders,
        "completed_orders": completed_orders,
        "completed_sales": round(completed_sales, 2),
        "non_cancelled_order_value": round(all_order_value, 2),
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
    }
