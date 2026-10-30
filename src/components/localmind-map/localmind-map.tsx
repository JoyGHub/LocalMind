import { Component, Element, h, Prop } from '@stencil/core';
import { Map, Marker } from 'maplibre-gl';
import { createPlacesMap, focusMapPlace, formatDistance, MapPlace, MapWidgetData } from '../../utils/utility';

@Component({
  tag: 'localmind-map',
  styleUrl: 'localmind-map.css',
  shadow: true,
})
export class LocalMindMap {
  @Element() el!: HTMLElement;
  @Prop() mapData!: MapWidgetData;

  mapInstance?: Map;
  placeMarkers: Marker[] = [];

  componentDidLoad() {
    this.initializeMap();
  }

  disconnectedCallback() {
    this.placeMarkers.forEach(marker => marker.remove());
    this.placeMarkers = [];
    this.mapInstance?.remove();
    this.mapInstance = undefined;
  }

  initializeMap() {
    const container = this.el.shadowRoot?.querySelector<HTMLElement>('.map-container');
    if (!container || !this.mapData) return;
    const createdMap = createPlacesMap(container, this.mapData);
    this.mapInstance = createdMap.map;
    this.placeMarkers = createdMap.placeMarkers;
  }

  focusPlace(place: MapPlace, index: number) {
    if (!this.mapInstance) return;
    focusMapPlace(this.mapInstance, this.placeMarkers[index], place);
  }

  renderPlace(place: MapPlace, index: number) {
    return (
      <div class="place-card">
        <button class="place-card-button" type="button" onClick={() => this.focusPlace(place, index)}>
          <div class="place-heading">
            <span class="place-number">{index + 1}</span>
            <span class="place-name">{place.name}</span>
            <span class="place-distance">{formatDistance(this.mapData.userLocation, place)}</span>
          </div>
          <div class="place-category">{place.category}</div>
          {place.address && <div class="place-address">{place.address}</div>}
          {place.opening_hours && <div class="place-hours">Hours: {place.opening_hours}</div>}
        </button>
      </div>
    );
  }

  render() {
    const hasPlaces = this.mapData.places.length > 0;

    return (
      <section class={{ 'map-widget': true, 'has-places': hasPlaces }} aria-label="Map and places">
        <link rel="stylesheet" href="/assets/maplibre-gl.css" />
        <div class="map-container" aria-label="Interactive map"></div>
        {hasPlaces && <div class="places-list">{this.mapData.places.map((place, index) => this.renderPlace(place, index))}</div>}
      </section>
    );
  }
}
