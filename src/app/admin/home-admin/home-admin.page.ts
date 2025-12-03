import { AfterViewInit, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonList, IonItem, IonLabel, IonIcon, IonSpinner, IonItemOption, IonItemSliding, IonItemOptions } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trash, save, location, download, eye, eyeOff } from 'ionicons/icons';

import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import View from 'ol/View';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import CircleStyle from 'ol/style/Circle';
import { Geolocation } from '@capacitor/geolocation';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { SupabaseService } from 'src/services/supabase.service';

interface Ruta {
  id?: string;
  nombre: string;
  descripcion?: string;
  geo_json: any;
  creado_en?: string;
  activa?: boolean;
}

@Component({
  selector: 'app-home-admin',
  templateUrl: './home-admin.page.html',
  styleUrls: ['./home-admin.page.scss'],
  standalone: true,
  imports: [IonItemOptions, IonItemSliding, IonItemOption, 
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonSpinner
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

  // Variables para el manejo de puntos y rutas
  public puntos: any[] = [];
  private rutasGeoJSON: any = {
    type: "FeatureCollection",
    features: []
  };

  // Variables para la UI
  rutasGuardadas: Ruta[] = [];
  mostrarRutasGuardadas: boolean = false;
  guardando: boolean = false;
  cargandoRutas: boolean = false;

  constructor(private supabaseService: SupabaseService) {
    addIcons({ trash, save, location, download, eye, eyeOff });
  }

  async ngOnInit() {
    await this.cargarRutasGuardadas();
  }

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
    this.markerLayer = new VectorLayer({ 
      source: new VectorSource(),
      style: new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: '#3880ff' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        })
      })
    });
    
    this.routeLayer = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        stroke: new Stroke({ color: '#ff0000', width: 4 }),
      }),
    });

    this.rutasLayer = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        stroke: new Stroke({ color: '#3880ff', width: 3 }),
      }),
    });

    this.carLayer = new VectorLayer({ source: new VectorSource() });

    this.map.addLayer(this.markerLayer);
    this.map.addLayer(this.routeLayer);
    this.map.addLayer(this.rutasLayer);
    this.map.addLayer(this.carLayer);

    // Agregar evento de clic al mapa para añadir puntos
    this.agregarEventoClicMapa();
  }

  private agregarEventoClicMapa(): void {
    this.map?.on('click', (event) => {
      const coordenadas = toLonLat(event.coordinate);
      this.agregarPunto(coordenadas[0], coordenadas[1]);
    });
  }

  private agregarPunto(lng: number, lat: number): void {
    // Crear feature del punto
    const punto = new Feature({
      geometry: new Point(fromLonLat([lng, lat]))
    });

    // Agregar al layer de marcadores
    this.markerLayer.getSource().addFeature(punto);

    // Guardar punto en el array
    const puntoData = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat]
      },
      properties: {
        id: Date.now(),
        name: `Punto ${this.puntos.length + 1}`,
        timestamp: new Date().toISOString(),
        orden: this.puntos.length + 1
      }
    };

    this.puntos.push(puntoData);

    // Actualizar la ruta si hay más de un punto
    if (this.puntos.length > 1) {
      this.actualizarRuta();
    }

    console.log('📍 Punto agregado:', puntoData);
  }

  private actualizarRuta(): void {
    if (this.puntos.length < 2) return;

    // Crear array de coordenadas para la línea
    const coordenadas = this.puntos.map(punto => 
      fromLonLat(punto.geometry.coordinates)
    );

    // Crear feature de la línea
    const linea = new Feature({
      geometry: new LineString(coordenadas)
    });

    // Limpiar ruta anterior y agregar nueva
    this.routeLayer.getSource().clear();
    this.routeLayer.getSource().addFeature(linea);

    // Actualizar GeoJSON de rutas
    this.actualizarGeoJSONRutas();
  }

  private actualizarGeoJSONRutas(): void {
    this.rutasGeoJSON = {
      type: "FeatureCollection",
      features: [
        // Puntos como features individuales
        ...this.puntos,
        // Línea que conecta los puntos
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: this.puntos.map(p => p.geometry.coordinates)
          },
          properties: {
            type: "route",
            name: `Ruta ${new Date().toLocaleDateString()}`,
            pointCount: this.puntos.length,
            distance: this.calcularDistanciaTotal(),
            creado_en: new Date().toISOString()
          }
        }
      ]
    };

    console.log('🔄 GeoJSON actualizado:', this.rutasGeoJSON);
  }

  public calcularDistanciaTotal(): number {
    if (this.puntos.length < 2) return 0;

    let distanciaTotal = 0;
    for (let i = 1; i < this.puntos.length; i++) {
      const [lon1, lat1] = this.puntos[i-1].geometry.coordinates;
      const [lon2, lat2] = this.puntos[i].geometry.coordinates;
      distanciaTotal += this.calcularDistancia(lat1, lon1, lat2, lon2);
    }

    return distanciaTotal;
  }

  private calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Método para guardar la ruta en Supabase
  async guardarRuta() {
    if (this.puntos.length < 2) {
      console.warn('⚠️ Necesitas al menos 2 puntos para guardar una ruta');
      alert('Necesitas al menos 2 puntos para guardar una ruta');
      return;
    }

    this.guardando = true;

    try {
      const ruta: Ruta = {
        nombre: `Ruta ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        descripcion: `Ruta creada con ${this.puntos.length} puntos. Distancia: ${this.calcularDistanciaTotal().toFixed(2)} km`,
        geo_json: this.rutasGeoJSON,
        activa: true
      };

      const { data, error } = await this.supabaseService.guardarRuta(ruta);

      if (error) {
        throw error;
      }

      console.log('💾 Ruta guardada en Supabase:', data);
      alert('Ruta guardada exitosamente en la base de datos!');
      
      // Recargar la lista de rutas
      await this.cargarRutasGuardadas();

    } catch (error) {
      console.error('❌ Error guardando ruta en Supabase:', error);
      alert('Error al guardar la ruta en la base de datos');
    } finally {
      this.guardando = false;
    }
  }

  // Método para cargar rutas guardadas desde Supabase
  async cargarRutasGuardadas() {
    this.cargandoRutas = true;
    
    try {
      const { data, error } = await this.supabaseService.obtenerRutas();

      if (error) {
        throw error;
      }

      this.rutasGuardadas = data || [];
      console.log('📂 Rutas cargadas desde Supabase:', this.rutasGuardadas.length);

    } catch (error) {
      console.error('❌ Error cargando rutas desde Supabase:', error);
      this.rutasGuardadas = [];
    } finally {
      this.cargandoRutas = false;
    }
  }

  // Método para cargar una ruta específica en el mapa
  async cargarRutaEnMapa(ruta: Ruta) {
    try {
      // Limpiar mapa actual
      this.limpiarRuta();

      // Cargar los puntos y la ruta desde el GeoJSON
      const geoJSON = ruta.geo_json;
      
      // Filtrar features de puntos (excluir la línea)
      const puntosFeatures = geoJSON.features.filter((feature: any) => 
        feature.geometry.type === 'Point'
      );

      // Cargar puntos
      puntosFeatures.forEach((puntoFeature: any) => {
        const [lng, lat] = puntoFeature.geometry.coordinates;
        this.agregarPunto(lng, lat);
      });

      console.log('🗺️ Ruta cargada en el mapa:', ruta.nombre);
      
      // Centrar el mapa en la ruta
      if (puntosFeatures.length > 0) {
        const primerPunto = puntosFeatures[0];
        const [lng, lat] = primerPunto.geometry.coordinates;
        this.map?.getView().animate({
          center: fromLonLat([lng, lat]),
          zoom: 15,
          duration: 1000
        });
      }

    } catch (error) {
      console.error('❌ Error cargando ruta en el mapa:', error);
      alert('Error al cargar la ruta en el mapa');
    }
  }

  // Método para eliminar una ruta de Supabase
  async eliminarRuta(ruta: Ruta) {
    if (!ruta.id) return;

    try {
      const { error } = await this.supabaseService.eliminarRuta(ruta.id);

      if (error) {
        throw error;
      }

      console.log('🗑️ Ruta eliminada:', ruta.id);
      await this.cargarRutasGuardadas(); // Recargar lista
      alert('Ruta eliminada exitosamente');

    } catch (error) {
      console.error('❌ Error eliminando ruta:', error);
      alert('Error al eliminar la ruta');
    }
  }

  // Método para limpiar todos los puntos y rutas del mapa actual
  limpiarRuta() {
    this.puntos = [];
    this.rutasGeoJSON = { type: "FeatureCollection", features: [] };
    
    this.markerLayer.getSource().clear();
    this.routeLayer.getSource().clear();
    
    console.log('🗑️ Ruta actual limpiada');
  }

  // Método para exportar el GeoJSON
  exportarGeoJSON() {
    if (this.puntos.length === 0) {
      console.warn('⚠️ No hay puntos para exportar');
      alert('No hay puntos para exportar');
      return;
    }

    const geoJSONStr = JSON.stringify(this.rutasGeoJSON, null, 2);
    const blob = new Blob([geoJSONStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ruta_${new Date().toISOString().split('T')[0]}.geojson`;
    link.click();
    
    URL.revokeObjectURL(url);
    console.log('📤 GeoJSON exportado');
  }

  // Método para centrar el mapa en la ubicación actual
  async centrarEnUbicacionActual() {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });

      const lat = coordinates.coords.latitude;
      const lng = coordinates.coords.longitude;

      this.map?.getView().animate({
        center: fromLonLat([lng, lat]),
        zoom: 15,
        duration: 1000
      });

    } catch (error) {
      console.error('❌ Error obteniendo ubicación actual:', error);
    }
  }

  // Alternar visibilidad de rutas guardadas
  toggleRutasGuardadas() {
    this.mostrarRutasGuardadas = !this.mostrarRutasGuardadas;
  }
}