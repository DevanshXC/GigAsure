"""Income estimation helpers (placeholder)."""


def estimate_weekly_income_from_orders(orders_count: int, avg_order_value: float) -> float:
    """Rough weekly proxy when platform data unavailable."""
    return float(orders_count * avg_order_value * 7)
