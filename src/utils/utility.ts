import maplibregl, { IControl, LngLatBounds, Map, Marker } from 'maplibre-gl';

const INITIAL_MAP_FOCUS_RADIUS_METERS = 20_000;

class MapNavigationControl implements IControl {
  private container?: HTMLElement;

  constructor(private readonly userLocation: MapCoordinates | null) {}

  onAdd(map: Map): HTMLElement {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

    const addButton = (className: string, label: string, action: () => void) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.setAttribute('aria-label', label);
      button.title = label;
      button.addEventListener('click', event => {
        event.preventDefault();
        action();
      });
      container.appendChild(button);
      return button;
    };

    addButton('maplibregl-ctrl-zoom-in', 'Zoom in', () => map.zoomIn());
    addButton('maplibregl-ctrl-zoom-out', 'Zoom out', () => map.zoomOut());
    const centerButton = addButton('maplibregl-ctrl-center-location', 'Center map on your location', () => {
      if (!isValidCoordinates(this.userLocation)) return;
      map.flyTo({
        center: [this.userLocation.lon, this.userLocation.lat],
        bearing: 0,
      });
    });
    centerButton.disabled = !isValidCoordinates(this.userLocation);

    this.container = container;
    return container;
  }

  onRemove(): void {
    this.container?.remove();
    this.container = undefined;
  }
}

export interface MapCoordinates {
  lat: number;
  lon: number;
}

export interface MapPlace extends MapCoordinates {
  id: number | string;
  name: string;
  category: string;
  address: string;
  opening_hours: string;
  distance_meters?: number | null;
  phone?: string;
  website?: string;
  rating?: number | null;
  photos?: unknown[];
  tags?: Record<string, unknown>;
  source?: string;
}

export interface MapWidgetData {
  center: [number, number];
  userLocation: MapCoordinates | null;
  places: MapPlace[];
}

export interface MapWidgetEventDetail {
  messageId: string;
  mapData: MapWidgetData;
}

export function calculateMapBounds(userLocation: MapCoordinates | null, places: MapCoordinates[]): LngLatBounds | null {
  const coordinates = [userLocation, ...places].filter(isValidCoordinates);
  if (coordinates.length === 0) return null;

  const bounds = new LngLatBounds();
  for (const coordinate of coordinates) {
    bounds.extend([coordinate.lon, coordinate.lat]);
  }
  return bounds;
}

export function isValidCoordinates(coordinate: MapCoordinates | null | undefined): coordinate is MapCoordinates {
  return coordinate !== null &&
    coordinate !== undefined &&
    Number.isFinite(coordinate.lat) &&
    Number.isFinite(coordinate.lon) &&
    coordinate.lat >= -90 &&
    coordinate.lat <= 90 &&
    coordinate.lon >= -180 &&
    coordinate.lon <= 180;
}

export function parseMapWidgetData(data: string): MapWidgetData {
  const parsed: unknown = JSON.parse(data);
  if (!parsed || typeof parsed !== 'object') throw new Error('Map tool returned invalid map data.');
  const mapData = parsed as Partial<MapWidgetData>;
  if (
    !Array.isArray(mapData.center) ||
    mapData.center.length !== 2 ||
    !Number.isFinite(mapData.center[0]) ||
    !Number.isFinite(mapData.center[1]) ||
    !(mapData.userLocation === null || isValidCoordinates(mapData.userLocation)) ||
    !Array.isArray(mapData.places) ||
    !mapData.places.every(place =>
      place &&
      (typeof place.id === 'number' || typeof place.id === 'string') &&
      typeof place.name === 'string' &&
      typeof place.category === 'string' &&
      typeof place.address === 'string' &&
      typeof place.opening_hours === 'string' &&
      isValidCoordinates(place),
    )
  ) {
    throw new Error('Map tool returned invalid map data.');
  }
  return mapData as MapWidgetData;
}

export function createPlacesMap(container: HTMLElement, mapData: MapWidgetData): { map: Map; placeMarkers: Marker[] } {
  const firstPlace = mapData.places.find(isValidCoordinates);
  const [longitude, latitude] = mapData.center;
  const userLocation = mapData.userLocation;
  const localPlaces = userLocation
    ? mapData.places.filter(place => calculateDistanceMeters(userLocation, place) <= INITIAL_MAP_FOCUS_RADIUS_METERS)
    : mapData.places;
  const center: [number, number] =
    isValidCoordinates({ lat: latitude, lon: longitude })
      ? [longitude, latitude]
      : firstPlace
        ? [firstPlace.lon, firstPlace.lat]
        : [0, 0];
  const map = new maplibregl.Map({
    container,
    style: 'https://tiles.openfreemap.org/styles/positron',
    center,
    zoom: 13,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    touchZoomRotate: false,
    maxPitch: 0,
  });
  map.addControl(new MapNavigationControl(userLocation), 'top-right');

  if (mapData.userLocation && isValidCoordinates(mapData.userLocation)) {
    const userMarker = document.createElement('div');
    userMarker.className = 'user-marker';
    userMarker.setAttribute('aria-label', 'Your location');
    new maplibregl.Marker({ element: userMarker })
      .setLngLat([mapData.userLocation.lon, mapData.userLocation.lat])
      .addTo(map);
  }

  const placeMarkers = mapData.places
    .map((place, index) => ({ place, index }))
    .filter(({ place }) => isValidCoordinates(place))
    .map(({ place, index }) => {
      const element = document.createElement('div');
      element.className = 'place-marker';
      element.setAttribute('aria-label', `Location ${index + 1}: ${place.name}`);
      const label = document.createElement('span');
      label.className = 'place-marker-content';
      const number = document.createElement('span');
      number.className = 'place-marker-number';
      number.textContent = String(index + 1);
      const name = document.createElement('span');
      name.className = 'place-marker-name';
      name.textContent = place.name;
      label.append(number, name);
      element.append(label);
      const popup = new maplibregl.Popup({ offset: 20 }).setText(place.name);
      return new maplibregl.Marker({ element, anchor: 'bottom' })
        .setLngLat([place.lon, place.lat])
        .setPopup(popup)
        .addTo(map);
    });

  const bounds = localPlaces.length
    ? calculateMapBounds(userLocation, localPlaces)
    : calculateMapBounds(null, mapData.places);
  if (bounds) map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
  return { map, placeMarkers };
}

export function focusMapPlace(map: Map, marker: Marker | undefined, place: MapPlace): void {
  map.flyTo({ center: [place.lon, place.lat], zoom: 17 });
  const popup = marker?.getPopup();
  if (popup && !popup.isOpen()) popup.addTo(map);
}

export function calculateDistanceMeters(origin: MapCoordinates, destination: MapCoordinates): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDifference = radians(destination.lat - origin.lat);
  const longitudeDifference = radians(destination.lon - origin.lon);
  const haversine = Math.min(1, Math.max(0,
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(radians(origin.lat)) * Math.cos(radians(destination.lat)) * Math.sin(longitudeDifference / 2) ** 2,
  ));
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function formatDistance(origin: MapCoordinates | null, destination: MapCoordinates): string {
  if (!origin) return 'Distance unavailable';
  const distance = calculateDistanceMeters(origin, destination);
  return distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`;
}

export async function readMapToolStream(response: Response, messageId: string | undefined): Promise<unknown> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Map tool request failed with status ${response.status}`);
  }
  if (!response.body) throw new Error('Map tool response did not include a stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = '';
  let dataLines: string[] = [];
  let toolResult: unknown;
  let hasToolResult = false;

  const dispatchEvent = () => {
    if (dataLines.length === 0) {
      eventName = '';
      return;
    }
    const data = dataLines.join('\n');
    if (eventName === 'map_widget') {
      if (!messageId) throw new Error('Could not identify the assistant message for the map results.');
      const mapData = parseMapWidgetData(data);
      window.dispatchEvent(new CustomEvent<MapWidgetEventDetail>('mapWidgetEvent', { detail: { messageId, mapData } }));
    } else if (eventName === 'tool_result') {
      const result = JSON.parse(data) as { result?: unknown };
      if (!result.result || typeof result.result !== 'object') throw new Error('Map tool returned an invalid result.');
      toolResult = result.result;
      hasToolResult = true;
    } else if (eventName === 'error') {
      const error = JSON.parse(data) as { error?: unknown };
      throw new Error(typeof error.error === 'string' ? error.error : 'Map tool request failed.');
    }
    eventName = '';
    dataLines = [];
  };

  const processLine = (line: string) => {
    if (line === '') {
      dispatchEvent();
    } else if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) processLine(line);
    if (done) break;
  }
  if (buffer) processLine(buffer);
  dispatchEvent();
  if (!hasToolResult) throw new Error('Map tool stream ended without a result.');
  return toolResult;
}
