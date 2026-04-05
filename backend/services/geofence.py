"""Shapely zone polygons — income coverage geography only."""

from typing import Optional

from shapely.geometry import Point, Polygon

# Ward-level bounding boxes (approximate) per zone_id in ZONE_MAP
ZONE_POLYGONS: dict[str, Polygon] = {}


def _box(center_lat: float, center_lng: float, dlat: float, dlng: float) -> Polygon:
    return Polygon(
        [
            (center_lng - dlng, center_lat - dlat),
            (center_lng + dlng, center_lat - dlat),
            (center_lng + dlng, center_lat + dlat),
            (center_lng - dlng, center_lat + dlat),
        ]
    )


# Build polygons from known centers (match trigger_monitor / mock API)
_centers = {
    "MUM-ANDHERI-W": (19.1252, 72.8464, 0.04, 0.045),
    "MUM-BANDRA-W": (19.0596, 72.8295, 0.035, 0.04),
    "MUM-DHARAVI": (19.0440, 72.8557, 0.03, 0.035),
    "MUM-POWAI": (19.1176, 72.9090, 0.035, 0.04),
    "MUM-FORT": (18.9345, 72.8376, 0.025, 0.03),
    "DEL-CONNAUGHT": (28.6315, 77.2167, 0.04, 0.045),
    "DEL-OKHLA": (28.5244, 77.2834, 0.035, 0.04),
    "DEL-ROHINI": (28.7495, 77.0627, 0.04, 0.045),
    "BLR-WHITEFIELD": (12.9698, 77.7499, 0.045, 0.05),
    "BLR-KORAMANGALA": (12.9352, 77.6245, 0.035, 0.04),
}

for zid, (la, lo, dla, dlo) in _centers.items():
    ZONE_POLYGONS[zid] = _box(la, lo, dla, dlo)


async def is_inside_zone(lat: float, lng: float, zone_id: str) -> bool:
    poly = ZONE_POLYGONS.get(zone_id)
    if poly is None:
        return True
    return poly.contains(Point(lng, lat))


async def get_zone_for_coordinates(lat: float, lng: float) -> Optional[str]:
    pt = Point(lng, lat)
    for zid, poly in ZONE_POLYGONS.items():
        if poly.contains(pt):
            return zid
    return None


async def check_gps_gap_coverage(
    last_confirmed_lat: float,
    last_confirmed_lng: float,
    recovered_lat: float,
    recovered_lng: float,
    zone_id: str,
) -> bool:
    a = await is_inside_zone(last_confirmed_lat, last_confirmed_lng, zone_id)
    b = await is_inside_zone(recovered_lat, recovered_lng, zone_id)
    return bool(a and b)
