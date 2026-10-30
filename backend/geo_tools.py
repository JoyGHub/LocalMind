import json
import logging
import math
from typing import Any, Generator, Optional
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


OVERPASS_URL = "https://overpass-api.de/api/interpreter"
PHOTON_URL = "https://photon.komoot.io/api/"
USER_AGENT = "LocalMind/1.0 (OpenStreetMap place search)"
MAX_QUERY_LENGTH = 200
MAX_SEARCH_OFFSET = 500
DEFAULT_SEARCH_RADIUS_METERS = 20_000
logger = logging.getLogger(__name__)

CATEGORY_TAGS = {
  "cafe": ("amenity", "cafe"),
  "restaurant": ("amenity", "restaurant"),
  "supermarket": ("shop", "supermarket"),
  "market": ("amenity", "marketplace"),
  "park": ("leisure", "park"),
  "pharmacy": ("amenity", "pharmacy"),
  "bakery": ("shop", "bakery"),
  "bar": ("amenity", "bar"),
  "fuel": ("amenity", "fuel"),
  "hotel": ("tourism", "hotel"),
  "library": ("amenity", "library"),
  "toilets": ("amenity", "toilets"),
}


def _request_json(url: str, data: Optional[bytes] = None) -> dict[str, Any]:
  headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
  if data is not None:
    headers["Content-Type"] = "application/x-www-form-urlencoded"
  request = Request(
    url,
    data=data,
    headers=headers,
  )
  with urlopen(request, timeout=20) as response:
    return json.loads(response.read().decode("utf-8"))


def _validate_coordinates(latitude: float, longitude: float) -> None:
  if (
    isinstance(latitude, bool)
    or not isinstance(latitude, (int, float))
    or not math.isfinite(latitude)
    or not -90 <= latitude <= 90
  ):
    raise OutOfRangeError("latitude must be a finite number between -90 and 90")
  if (
    isinstance(longitude, bool)
    or not isinstance(longitude, (int, float))
    or not math.isfinite(longitude)
    or not -180 <= longitude <= 180
  ):
    raise OutOfRangeError("longitude must be a finite number between -180 and 180")


class OutOfRangeError(ValueError):
  pass


class InvalidInputError(ValueError):
  pass


def _address(tags: dict[str, Any]) -> str:
  street = " ".join(
    value for value in (tags.get("addr:housenumber"), tags.get("addr:street")) if value
  )
  locality = ", ".join(
    value for value in (
      tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village"),
      tags.get("addr:postcode"),
      tags.get("addr:country"),
    ) if value
  )
  return ", ".join(value for value in (street, locality) if value)


def _distance_meters(latitude: float, longitude: float, place_latitude: float, place_longitude: float) -> float:
  radians = math.radians
  latitude_difference = radians(place_latitude - latitude)
  longitude_difference = radians(place_longitude - longitude)
  haversine = (
    math.sin(latitude_difference / 2) ** 2
    + math.cos(radians(latitude)) * math.cos(radians(place_latitude)) * math.sin(longitude_difference / 2) ** 2
  )
  return 6_371_000 * 2 * math.atan2(math.sqrt(haversine), math.sqrt(max(0, 1 - haversine)))


def _photon_bbox(latitude: float, longitude: float, radius: int) -> Optional[str]:
  latitude_delta = radius / 111_320
  latitude_cosine = math.cos(math.radians(latitude))
  longitude_delta = 180 if abs(latitude_cosine) < 1e-6 else radius / (111_320 * abs(latitude_cosine))
  south = max(-90, latitude - latitude_delta)
  north = min(90, latitude + latitude_delta)
  west = longitude - longitude_delta
  east = longitude + longitude_delta
  if west < -180 or east > 180:
    return None
  return ",".join(str(value) for value in (west, south, east, north))


def _photon_places(response: dict[str, Any], fallback_name: str) -> list[dict[str, Any]]:
  places = []
  for index, feature in enumerate(response.get("features", [])):
    properties = feature.get("properties", {})
    coordinates = feature.get("geometry", {}).get("coordinates", [])
    if not isinstance(coordinates, list) or len(coordinates) < 2:
      continue
    longitude, latitude = coordinates[:2]
    if (
      isinstance(latitude, bool)
      or isinstance(longitude, bool)
      or not isinstance(latitude, (int, float))
      or not isinstance(longitude, (int, float))
      or not math.isfinite(latitude)
      or not math.isfinite(longitude)
      or not -90 <= latitude <= 90
      or not -180 <= longitude <= 180
    ):
      continue
    places.append({
      "id": properties.get("osm_id") or f"photon-{index}",
      "name": properties.get("name") or properties.get("label") or fallback_name,
      "lat": latitude,
      "lon": longitude,
      "category": properties.get("osm_value") or properties.get("type") or "place",
      "address": _photon_address(properties),
      "opening_hours": properties.get("opening_hours", ""),
      "phone": properties.get("phone") or properties.get("contact:phone", ""),
      "website": properties.get("website") or properties.get("contact:website", ""),
      "rating": (
        properties.get("rating")
        if isinstance(properties.get("rating"), (int, float)) and not isinstance(properties.get("rating"), bool)
        else None
      ),
      "photos": properties.get("photos", []) if isinstance(properties.get("photos", []), list) else [],
      "tags": properties,
      "source": "photon",
    })
  return places


def _unique_places(places: list[dict[str, Any]]) -> list[dict[str, Any]]:
  unique_places = []
  seen_ids = set()
  seen_locations = set()
  for place in places:
    location_key = (
      place["name"].strip().casefold(),
      round(place["lat"], 5),
      round(place["lon"], 5),
    )
    if place["id"] in seen_ids or location_key in seen_locations:
      continue
    seen_ids.add(place["id"])
    seen_locations.add(location_key)
    unique_places.append(place)
  return unique_places


def _map_event(places: list[dict[str, Any]], center: list[float], user_location: Optional[dict[str, float]]) -> str:
  payload = {"center": center, "userLocation": user_location, "places": places}
  return f"event: map_widget\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _prepare_results(
  places: list[dict[str, Any]],
  latitude: Optional[float],
  longitude: Optional[float],
  offset: int,
  limit: int,
  sort_by: str,
) -> tuple[list[dict[str, Any]], int, bool]:
  for place in places:
    place["distance_meters"] = (
      round(_distance_meters(latitude, longitude, place["lat"], place["lon"]))
      if latitude is not None and longitude is not None else None
    )
  if sort_by == "distance" and latitude is not None and longitude is not None:
    places.sort(key=lambda place: place["distance_meters"])
  elif sort_by == "rating":
    places.sort(key=lambda place: (place.get("rating") is None, -(place.get("rating") or 0)))

  total_count = len(places)
  return places[offset:offset + limit], total_count, offset + limit < total_count


def _tool_response(
  places: list[dict[str, Any]],
  total_count: int,
  has_more: bool,
  source: str,
  parameters: dict[str, Any],
) -> dict[str, Any]:
  return {
    "status": "ok" if places else "no_results",
    "message": None if places else "No matching places were returned; provider coverage may be incomplete.",
    "places": places,
    "total_count": total_count,
    "has_more": has_more,
    "coverage": "results_found" if places else "provider_responded",
    "source": source,
    "parameters": parameters,
  }


def search_nearby_places(
  latitude: float,
  longitude: float,
  category: str,
  radius: int = DEFAULT_SEARCH_RADIUS_METERS,
  limit: int = 10,
  offset: int = 0,
  sort_by: str = "distance",
  include_details: bool = False,
) -> Generator[str, None, dict[str, Any]]:
  _validate_coordinates(latitude, longitude)
  if not isinstance(category, str) or category.lower() not in CATEGORY_TAGS:
    raise InvalidInputError(f"category must be one of: {', '.join(CATEGORY_TAGS)}")
  if isinstance(radius, bool) or not isinstance(radius, int) or not 1 <= radius <= 50000:
    raise OutOfRangeError("radius must be an integer between 1 and 50000 meters")
  if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 50:
    raise OutOfRangeError("limit must be an integer between 1 and 50")
  if isinstance(offset, bool) or not isinstance(offset, int) or not 0 <= offset <= MAX_SEARCH_OFFSET:
    raise OutOfRangeError(f"offset must be an integer between 0 and {MAX_SEARCH_OFFSET}")
  if sort_by not in ("distance", "relevance", "rating"):
    raise InvalidInputError("sort_by must be distance, relevance, or rating")
  if not isinstance(include_details, bool):
    raise InvalidInputError("include_details must be a boolean")

  tag_key, tag_value = CATEGORY_TAGS[category.lower()]
  query = (
    "[out:json][timeout:15];"
    f'nwr["{tag_key}"="{tag_value}"](around:{radius},{latitude},{longitude});'
    f"out center tags {min(offset + limit + 1, 1000)};"
  )
  places = []
  source = "osm"
  overpass_error: Optional[Exception] = None
  try:
    response = _request_json(OVERPASS_URL, urlencode({"data": query}).encode("utf-8"))
    for element in response.get("elements", []):
      tags = element.get("tags", {})
      coordinates = element.get("center", element)
      lat = coordinates.get("lat")
      lon = coordinates.get("lon")
      if (
        isinstance(lat, bool)
        or isinstance(lon, bool)
        or not isinstance(lat, (int, float))
        or not isinstance(lon, (int, float))
        or not math.isfinite(lat)
        or not math.isfinite(lon)
      ):
        continue
      if _distance_meters(latitude, longitude, lat, lon) > radius:
        continue
      places.append({
        "id": element.get("id"),
        "name": tags.get("name") or "Unnamed place",
        "lat": lat,
        "lon": lon,
        "category": category.lower(),
        "address": _address(tags),
        "opening_hours": tags.get("opening_hours", ""),
        "phone": tags.get("phone") or tags.get("contact:phone", ""),
        "website": tags.get("website") or tags.get("contact:website", ""),
        "rating": None,
        "photos": [],
        "tags": tags,
        "source": "osm",
      })
  except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
    overpass_error = error
    logger.warning("Overpass place search failed; trying Photon fallback: %s", error)

  if not places:
    photon_query = "marketplace" if category.lower() == "market" else category.lower()
    params: dict[str, Any] = {
      "q": photon_query,
      "lat": latitude,
      "lon": longitude,
      "limit": 50,
    }
    bbox = _photon_bbox(latitude, longitude, radius)
    if bbox:
      params["bbox"] = bbox
    try:
      photon_response = _request_json(f"{PHOTON_URL}?{urlencode(params)}")
      source = "photon"
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
      if overpass_error:
        raise RuntimeError(f"Overpass search failed ({overpass_error}); Photon fallback failed ({error})") from error
      raise RuntimeError(f"Photon fallback failed: {error}") from error

    places = _unique_places([
      {**place, "category": category.lower()}
      for place in _photon_places(photon_response, category.title())
      if _distance_meters(latitude, longitude, place["lat"], place["lon"]) <= radius
    ])

  user_location = {"lat": latitude, "lon": longitude}
  if include_details:
    for place in places:
      place["details"] = {
        "opening_hours": place["opening_hours"],
        "phone": place["phone"],
        "website": place["website"],
        "rating": place["rating"],
        "photos": place["photos"],
        "tags": place["tags"],
      }
  page, total_count, has_more = _prepare_results(places, latitude, longitude, offset, limit, sort_by)
  yield _map_event(page, [longitude, latitude], user_location)
  return _tool_response(
    page,
    total_count,
    has_more,
    source,
    {
      "latitude": latitude,
      "longitude": longitude,
      "category": category.lower(),
      "radius": radius,
      "limit": limit,
      "offset": offset,
      "sort_by": sort_by,
      "include_details": include_details,
    },
  )


def _photon_address(properties: dict[str, Any]) -> str:
  street = " ".join(
    value for value in (properties.get("housenumber"), properties.get("street")) if value
  )
  locality = ", ".join(
    value for value in (
      properties.get("postcode"),
      properties.get("city") or properties.get("district"),
      properties.get("state"),
      properties.get("country"),
    ) if value
  )
  return ", ".join(value for value in (street, locality) if value)


def search_place_by_query(
  query: str,
  latitude: Optional[float] = None,
  longitude: Optional[float] = None,
  limit: int = 5,
  offset: int = 0,
  sort_by: Optional[str] = None,
  include_details: bool = False,
  radius: int = DEFAULT_SEARCH_RADIUS_METERS,
) -> Generator[str, None, dict[str, Any]]:
  if not isinstance(query, str) or not query.strip():
    raise InvalidInputError("query must not be empty")
  normalized_query = query.strip()
  if len(normalized_query) > MAX_QUERY_LENGTH:
    raise OutOfRangeError(f"query must be no longer than {MAX_QUERY_LENGTH} characters")
  if any(ord(character) < 32 for character in normalized_query):
    raise InvalidInputError("query must not contain control characters")
  if (latitude is None) != (longitude is None):
    raise InvalidInputError("latitude and longitude must be provided together")
  if latitude is not None and longitude is not None:
    _validate_coordinates(latitude, longitude)
  if isinstance(radius, bool) or not isinstance(radius, int) or not 1 <= radius <= 50000:
    raise OutOfRangeError("radius must be an integer between 1 and 50000 meters")
  if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 50:
    raise OutOfRangeError("limit must be an integer between 1 and 50")
  if isinstance(offset, bool) or not isinstance(offset, int) or not 0 <= offset <= MAX_SEARCH_OFFSET:
    raise OutOfRangeError(f"offset must be an integer between 0 and {MAX_SEARCH_OFFSET}")
  sort_by = sort_by or ("distance" if latitude is not None else "relevance")
  if sort_by not in ("distance", "relevance", "rating"):
    raise InvalidInputError("sort_by must be distance, relevance, or rating")
  if not isinstance(include_details, bool):
    raise InvalidInputError("include_details must be a boolean")

  params: dict[str, Any] = {"q": normalized_query, "limit": 50}
  if latitude is not None and longitude is not None:
    params.update({"lat": latitude, "lon": longitude})
    bbox = _photon_bbox(latitude, longitude, radius)
    if bbox:
      params["bbox"] = bbox
  response = _request_json(f"{PHOTON_URL}?{urlencode(params)}")
  places = _unique_places(_photon_places(response, normalized_query))
  if latitude is not None and longitude is not None:
    places = [
      place for place in places
      if _distance_meters(latitude, longitude, place["lat"], place["lon"]) <= radius
    ]
  if include_details:
    for place in places:
      place["details"] = {
        "opening_hours": place["opening_hours"],
        "phone": place["phone"],
        "website": place["website"],
        "rating": place["rating"],
        "photos": place["photos"],
        "tags": place["tags"],
      }

  user_location = {"lat": latitude, "lon": longitude} if latitude is not None and longitude is not None else None
  page, total_count, has_more = _prepare_results(places, latitude, longitude, offset, limit, sort_by)
  if user_location:
    center = [longitude, latitude]
  elif places:
    center = [places[0]["lon"], places[0]["lat"]]
  else:
    center = [0, 0]
  yield _map_event(page, center, user_location)
  return _tool_response(
    page,
    total_count,
    has_more,
    "photon",
    {
      "query": normalized_query,
      "latitude": latitude,
      "longitude": longitude,
      "radius": radius,
      "limit": limit,
      "offset": offset,
      "sort_by": sort_by,
      "include_details": include_details,
    },
  )


def stream_tool_result(tool: Generator[str, None, dict[str, Any]]) -> Generator[str, None, None]:
  try:
    result = yield from tool
  except OutOfRangeError as error:
    result = {
      "status": "out_of_range", "message": str(error), "places": [], "total_count": 0,
      "has_more": False, "coverage": "unknown", "source": None, "parameters": {},
    }
  except InvalidInputError as error:
    result = {
      "status": "invalid_input", "message": str(error), "places": [], "total_count": 0,
      "has_more": False, "coverage": "unknown", "source": None, "parameters": {},
    }
  except Exception as error:
    logger.exception("Place search failed")
    result = {
      "status": "service_error", "message": str(error), "places": [], "total_count": 0,
      "has_more": False, "coverage": "unavailable", "source": None, "parameters": {},
    }

  yield f"event: tool_result\ndata: {json.dumps({'result': result}, ensure_ascii=False)}\n\n"
