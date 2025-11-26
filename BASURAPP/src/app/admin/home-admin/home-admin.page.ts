import { AfterViewInit, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import { Geolocation } from '@capacitor/geolocation';
@Component({
  selector: 'app-home-admin',
  templateUrl: './home-admin.page.html',
  styleUrls: ['./home-admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar
  ]
})  
export class HomeAdminPage implements OnInit, AfterViewInit {
  private map: Map | undefined;
  isLoading: boolean = false;
  currentLocation: { lat: number; lng: number } | null = null;
  markerLayer: any;
  routeLayer: any;
  private rutasLayer: any;
  private carLayer: any;

  // Ubicación única en Buenaventura

  constructor() { }

  ngOnInit() {}

  ngAfterViewInit() {
    this.MostrarMapa();
  }
 
async MostrarMapa() {
    this.isLoading = true;

    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      });

      const lat = coordinates.coords.latitude;
      const lng = coordinates.coords.longitude;

      console.log('📍 Ubicación REAL obtenida:', { lat, lng });
      this.currentLocation = { lat, lng };

      this.initializeMap(lng, lat);
    } catch (error) {
      console.error('❌ Error obteniendo ubicación:', error);
      console.log('🗺️ Usando ubicación por defecto: Buenaventura');
      this.initializeMap(-77.0797, 3.8836);
    } finally {
      this.isLoading = false;
    }
  }
  private initializeMap(lng: number, lat: number): void {
    if (this.map) {
      this.map.setTarget(undefined);
    }

    this.map = new Map({
      target: 'mapId',
      layers: [
        new TileLayer({
          source: new OSM({
            attributions: [],
          }),
        }),
      ],
      view: new View({
        center: fromLonLat([lng, lat]),
        zoom: 15,
      }),
    });

    // Capas del mapa
    this.markerLayer = new VectorLayer({ source: new VectorSource() });
    
    this.routeLayer = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        stroke: new Stroke({ color: '#ff0000', width: 4 }),
      }),
    });

    this.rutasLayer = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        stroke: new Stroke({ color: '#3880ff', width: 3, lineDash: [5, 5] }),
      }),
    });

    this.carLayer = new VectorLayer({ source: new VectorSource() });

    this.map.addLayer(this.markerLayer);
    this.map.addLayer(this.routeLayer);
    this.map.addLayer(this.rutasLayer);
    this.map.addLayer(this.carLayer);
  }
}
