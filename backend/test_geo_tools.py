import json
import unittest
from unittest.mock import patch
from urllib.parse import unquote_plus

from backend.geo_tools import search_nearby_places, search_place_by_query, stream_tool_result


class GeoToolsTests(unittest.TestCase):
  @patch("backend.geo_tools._request_json")
  def test_nearby_places_returns_structured_results_and_map_event(self, request_json):
    request_json.return_value = {
      "elements": [{
        "type": "way",
        "id": 123,
        "center": {"lat": 47.5, "lon": 19.0},
        "tags": {
          "name": "Central Cafe",
          "addr:street": "Main Street",
          "addr:housenumber": "10",
          "opening_hours": "Mo-Fr 08:00-18:00",
        },
      }]
    }

    events = list(stream_tool_result(search_nearby_places(47.5, 19.0, "cafe", include_details=True)))
    map_event = json.loads(events[0].split("data: ", 1)[1])
    result_event = json.loads(events[1].split("data: ", 1)[1])

    self.assertTrue(events[0].startswith("event: map_widget\n"))
    self.assertEqual(map_event["center"], [19.0, 47.5])
    self.assertEqual(map_event["places"][0]["id"], 123)
    self.assertEqual(map_event["places"][0]["address"], "10 Main Street")
    self.assertEqual(map_event["places"][0]["opening_hours"], "Mo-Fr 08:00-18:00")
    self.assertEqual(result_event["result"]["status"], "ok")
    self.assertEqual(result_event["result"]["places"][0]["distance_meters"], 0)
    self.assertEqual(result_event["result"]["places"][0]["source"], "osm")
    self.assertEqual(result_event["result"]["places"][0]["tags"]["name"], "Central Cafe")
    self.assertEqual(result_event["result"]["places"][0]["details"]["phone"], "")
    self.assertEqual(result_event["result"]["source"], "osm")
    self.assertEqual(result_event["result"]["parameters"]["limit"], 10)
    self.assertEqual(result_event["result"]["parameters"]["radius"], 20000)
    self.assertIn("around:20000", unquote_plus(request_json.call_args.args[1].decode("utf-8")))
    request_json.assert_called_once()

  @patch("backend.geo_tools._request_json")
  def test_place_query_uses_photon_results(self, request_json):
    request_json.return_value = {
      "features": [{
        "geometry": {"coordinates": [2.3, 48.8]},
        "properties": {
          "osm_id": 456,
          "name": "Central Market",
          "osm_value": "marketplace",
          "street": "Rue Centrale",
          "housenumber": "5",
          "city": "Paris",
        },
      }]
    }

    events = list(stream_tool_result(search_place_by_query("Central Market")))
    map_event = json.loads(events[0].split("data: ", 1)[1])
    place = map_event["places"][0]

    self.assertEqual(map_event["center"], [2.3, 48.8])
    self.assertIsNone(map_event["userLocation"])
    self.assertEqual(place["id"], 456)
    self.assertEqual(place["category"], "marketplace")
    self.assertEqual(place["address"], "5 Rue Centrale, Paris")
    result_event = json.loads(events[1].split("data: ", 1)[1])
    self.assertEqual(result_event["result"]["status"], "ok")
    self.assertIsNone(result_event["result"]["places"][0]["distance_meters"])
    self.assertEqual(result_event["result"]["source"], "photon")
    self.assertIn("photon.komoot.io/api/", request_json.call_args.args[0])

  def test_invalid_category_is_returned_as_invalid_input(self):
    events = list(stream_tool_result(search_nearby_places(47.5, 19.0, "unknown")))

    self.assertTrue(events[0].startswith("event: tool_result\n"))
    result = json.loads(events[0].split("data: ", 1)[1])["result"]
    self.assertEqual(result["status"], "invalid_input")
    self.assertIn("category", result["message"])

  @patch("backend.geo_tools._request_json")
  def test_nearby_search_falls_back_to_photon_and_respects_radius(self, request_json):
    request_json.side_effect = [
      TimeoutError("Overpass timed out"),
      {
        "features": [
          {
            "geometry": {"coordinates": [24.1764, 45.0806]},
            "properties": {"osm_id": 789, "name": "Nearby Restaurant"},
          },
          {
            "geometry": {"coordinates": [24.5, 45.3]},
            "properties": {"osm_id": 790, "name": "Far Restaurant"},
          },
        ]
      },
    ]

    events = list(stream_tool_result(search_nearby_places(45.0833, 24.1833, "restaurant", 2000, 8)))
    map_event = json.loads(events[0].split("data: ", 1)[1])

    self.assertEqual([place["name"] for place in map_event["places"]], ["Nearby Restaurant"])
    self.assertEqual(map_event["places"][0]["category"], "restaurant")
    self.assertEqual(request_json.call_count, 2)
    self.assertIn("bbox=", request_json.call_args.args[0])

  @patch("backend.geo_tools._request_json")
  def test_place_query_limits_results_to_default_radius_and_removes_duplicates(self, request_json):
    request_json.return_value = {
      "features": [
        {
          "geometry": {"coordinates": [25.537518, 44.2838851]},
          "properties": {"osm_id": 1, "name": "Far Coffee Shop", "osm_value": "cafe"},
        },
        {
          "geometry": {"coordinates": [24.1763894, 45.0806232]},
          "properties": {"osm_id": 2, "name": "Nearby Restaurant", "osm_value": "restaurant"},
        },
        {
          "geometry": {"coordinates": [24.1777691, 45.0774357]},
          "properties": {"osm_id": 2, "name": "Nearby Restaurant", "osm_value": "restaurant"},
        },
      ]
    }

    events = list(stream_tool_result(search_place_by_query("restaurant", 45.0833, 24.1833, 5)))
    map_event = json.loads(events[0].split("data: ", 1)[1])

    self.assertEqual([place["name"] for place in map_event["places"]], ["Nearby Restaurant"])
    self.assertIn("limit=50", request_json.call_args.args[0])
    self.assertIn("bbox=", request_json.call_args.args[0])
    result = json.loads(events[-1].split("data: ", 1)[1])["result"]
    self.assertEqual(result["total_count"], 1)
    self.assertEqual(result["parameters"]["radius"], 20000)

  @patch("backend.geo_tools._request_json")
  def test_place_query_uses_requested_location_as_radius_center(self, request_json):
    request_json.return_value = {
      "features": [
        {
          "geometry": {"coordinates": [-0.12, 51.51]},
          "properties": {"osm_id": 1, "name": "London Padel Court"},
        },
        {
          "geometry": {"coordinates": [2.35, 48.86]},
          "properties": {"osm_id": 2, "name": "Paris Padel Court"},
        },
      ]
    }

    events = list(stream_tool_result(search_place_by_query(
      "padel courts", 51.5072, -0.1276,
    )))
    result = json.loads(events[-1].split("data: ", 1)[1])["result"]

    self.assertEqual([place["name"] for place in result["places"]], ["London Padel Court"])
    self.assertEqual(result["parameters"]["radius"], 20000)

  def test_empty_query_is_invalid_input_and_out_of_range_limit_is_distinct(self):
    empty_result = list(stream_tool_result(search_place_by_query(" ")))[0]
    self.assertEqual(
      json.loads(empty_result.split("data: ", 1)[1])["result"]["status"],
      "invalid_input",
    )

    range_result = list(stream_tool_result(search_nearby_places(95, 19, "cafe")))[0]
    result = json.loads(range_result.split("data: ", 1)[1])["result"]
    self.assertEqual(result["status"], "out_of_range")
    self.assertIn("latitude", result["message"])

  @patch("backend.geo_tools._request_json")
  def test_query_pagination_and_distance_sorting(self, request_json):
    request_json.return_value = {
      "features": [
        {
          "geometry": {"coordinates": [24.2, 45.1]},
          "properties": {"osm_id": 10, "name": "Far", "osm_value": "cafe"},
        },
        {
          "geometry": {"coordinates": [24.1833, 45.0833]},
          "properties": {"osm_id": 11, "name": "Near", "osm_value": "cafe"},
        },
        {
          "geometry": {"coordinates": [24.19, 45.09]},
          "properties": {"osm_id": 12, "name": "Middle", "osm_value": "cafe"},
        },
      ]
    }
    events = list(stream_tool_result(search_place_by_query(
      "cafe", 45.0833, 24.1833, limit=1, offset=1, sort_by="distance",
    )))
    result = json.loads(events[-1].split("data: ", 1)[1])["result"]

    self.assertEqual(result["total_count"], 3)
    self.assertTrue(result["has_more"])
    self.assertEqual(result["places"][0]["name"], "Middle")

  @patch("backend.geo_tools._request_json")
  def test_empty_results_and_provider_failure_have_distinct_status_and_coverage(self, request_json):
    request_json.return_value = {"features": []}
    empty_result = list(stream_tool_result(search_place_by_query("Unknown Place")))[-1]
    empty = json.loads(empty_result.split("data: ", 1)[1])["result"]
    self.assertEqual(empty["status"], "no_results")
    self.assertEqual(empty["coverage"], "provider_responded")

    request_json.side_effect = RuntimeError("Provider unavailable")
    error_result = list(stream_tool_result(search_place_by_query("Unknown Place")))[-1]
    error = json.loads(error_result.split("data: ", 1)[1])["result"]
    self.assertEqual(error["status"], "service_error")
    self.assertEqual(error["coverage"], "unavailable")


if __name__ == "__main__":
  unittest.main()
