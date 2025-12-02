import { AfterViewInit, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonButton, 
  IonList, 
  IonItem, 
  IonLabel, 
  IonIcon,
  IonSpinner,
  IonSelect,
  IonSelectOption,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { play, pause, stop, car, location, refresh, eye, navigate } from 'ionicons/icons';

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
import Icon from 'ol/style/Icon';
import { Geolocation } from '@capacitor/geolocation';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { SupabaseService } from 'src/services/supabase.service';

interface Ruta {
  id: string;
  nombre: string;
  descripcion?: string;
  geo_json: any;
  creado_en: string;
  activa: boolean;
}

@Component({
  selector: 'app-home-conductor',
  templateUrl: './home-conductor.page.html',
  styleUrls: ['./home-conductor.page.scss'],
  standalone: true,
  imports: [
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
    IonSpinner,
    IonSelect,
    IonSelectOption
  ]
})
export class HomeConductorPage implements OnInit, AfterViewInit {
  private map: Map | undefined;
  isLoading: boolean = false;
  cargandoRutas: boolean = false;
  
  // Capas del mapa
  private rutasLayer: VectorLayer<any>;
  private puntosLayer: VectorLayer<any>;
  private carroLayer: VectorLayer<any>;
  private rutaSeleccionadaLayer: VectorLayer<any>;
  
  // Variables para rutas
  rutasDisponibles: Ruta[] = [];
  rutaSeleccionada: Ruta | null = null;
  mostrarPanelSeleccion: boolean = true;
  
  // Variables para el recorrido
  recorridoActivo: boolean = false;
  recorridoPausado: boolean = false;
  private intervaloRecorrido: any;
  public puntosRecorrido: any[] = [];
  public indiceRecorrido: number = 0;
  private velocidad: number = 300; // ms entre puntos (más lento para mejor visualización)
  private carroFeature: Feature | null = null;
  
  // Estadísticas del recorrido
  progreso: number = 0;
  distanciaRecorrida: number = 0;
  distanciaTotal: number = 0;

  constructor(
    private supabaseService: SupabaseService,
    private alertController: AlertController
  ) {
    addIcons({ play, pause, stop, car, location, refresh, eye, navigate });
    
    // Inicializar capas
    this.rutasLayer = new VectorLayer({ 
      source: new VectorSource(),
      style: new Style({
        stroke: new Stroke({ 
          color: '#666666', 
          width: 2,
          lineDash: [5, 5]
        })
      })
    });
    
    this.puntosLayer = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        image: new CircleStyle({
          radius: 4,
          fill: new Fill({ color: '#666666' }),
          stroke: new Stroke({ color: '#ffffff', width: 1 })
        })
      })
    });
    
    this.carroLayer = new VectorLayer({
      source: new VectorSource()
    });
    
    this.rutaSeleccionadaLayer = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        stroke: new Stroke({ 
          color: '#2dd36f', 
          width: 4 
        })
      })
    });
  }

  async ngOnInit() {
    await this.cargarRutasDisponibles();
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

      console.log('📍 Ubicación del conductor:', { lat, lng });
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
        this.rutasLayer,
        this.puntosLayer,
        this.rutaSeleccionadaLayer,
        this.carroLayer
      ],
      view: new View({
        center: fromLonLat([lng, lat]),
        zoom: 15,
      }),
    });
  }

  async cargarRutasDisponibles() {
    this.cargandoRutas = true;
    
    try {
      const result: any = await this.supabaseService.obtenerRutasActivas();
      const data = result.data as Ruta[];
      const error = result.error;

      if (error) {
        throw error;
      }

      this.rutasDisponibles = data || [];
      console.log('📂 Rutas disponibles:', this.rutasDisponibles.length);
      
    } catch (error) {
      console.error('❌ Error cargando rutas:', error);
      this.rutasDisponibles = [];
    } finally {
      this.cargandoRutas = false;
    }
  }

  seleccionarRuta(event: any) {
    const rutaId = event.detail.value;
    this.rutaSeleccionada = this.rutasDisponibles.find(r => r.id === rutaId) || null;
    
    if (this.rutaSeleccionada) {
      this.cargarRutaSeleccionadaEnMapa();
      this.prepararRecorrido();
    }
  }

  private cargarRutaSeleccionadaEnMapa() {
    if (!this.rutaSeleccionada) return;
    
    // Limpiar capas
    this.rutaSeleccionadaLayer.getSource().clear();
    this.puntosLayer.getSource().clear();
    this.rutasLayer.getSource().clear();
    this.carroLayer.getSource().clear();
    
    const geoJSON = this.rutaSeleccionada.geo_json;
    
    // Cargar línea de la ruta seleccionada
    const lineaFeature = geoJSON.features.find((f: any) => 
      f.geometry.type === 'LineString'
    );
    
    if (lineaFeature) {
      const coordenadas = lineaFeature.geometry.coordinates.map((coord: [number, number]) => 
        fromLonLat(coord)
      );
      
      const linea = new Feature({
        geometry: new LineString(coordenadas)
      });
      
      this.rutaSeleccionadaLayer.getSource().addFeature(linea);
      
      // Cargar puntos de la ruta seleccionada
      const puntosFeatures = geoJSON.features.filter((f: any) => 
        f.geometry.type === 'Point'
      );
      
      puntosFeatures.forEach((punto: any) => {
        const [lng, lat] = punto.geometry.coordinates;
        const feature = new Feature({
          geometry: new Point(fromLonLat([lng, lat]))
        });
        
        this.puntosLayer.getSource().addFeature(feature);
      });
      
      // Centrar mapa en la ruta
      if (coordenadas.length > 0) {
        this.map?.getView().animate({
          center: coordenadas[0],
          zoom: 14,
          duration: 1000
        });
      }
    }
  }

  private prepararRecorrido() {
    if (!this.rutaSeleccionada) return;
    
    const geoJSON = this.rutaSeleccionada.geo_json;
    const lineaFeature = geoJSON.features.find((f: any) => 
      f.geometry.type === 'LineString'
    );
    
    if (lineaFeature) {
      this.puntosRecorrido = lineaFeature.geometry.coordinates;
      this.indiceRecorrido = 0;
      this.progreso = 0;
      this.distanciaRecorrida = 0;
      this.distanciaTotal = this.calcularDistanciaTotal(this.puntosRecorrido);
      console.log('📐 Puntos del recorrido:', this.puntosRecorrido.length);
    }
  }

  private calcularDistanciaTotal(puntos: any[]): number {
    if (puntos.length < 2) return 0;

    let distanciaTotal = 0;
    for (let i = 1; i < puntos.length; i++) {
      const [lon1, lat1] = puntos[i-1];
      const [lon2, lat2] = puntos[i];
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

  iniciarRecorrido() {
    if (!this.rutaSeleccionada || this.recorridoActivo) return;
    
    if (this.puntosRecorrido.length < 2) {
      this.mostrarAlerta('Error', 'La ruta seleccionada no tiene suficientes puntos');
      return;
    }
    
    this.recorridoActivo = true;
    this.recorridoPausado = false;
    this.mostrarPanelSeleccion = false;
    
    // Crear feature del carro
    const [startLng, startLat] = this.puntosRecorrido[0];
    this.carroFeature = new Feature({
      geometry: new Point(fromLonLat([startLng, startLat]))
    });
    
    // Crear estilo del carro
    const carStyle = new Style({
      image: new Icon({
        src: 'assets/icon/car.svg',
        scale: 0.8,
        anchor: [0.5, 0.5],
        rotateWithView: true
      })
    });
    
    this.carroFeature.setStyle(carStyle);
    
    // Limpiar y agregar el carro
    this.carroLayer.getSource().clear();
    this.carroLayer.getSource().addFeature(this.carroFeature);
    
    // Centrar en el inicio de la ruta
    this.map?.getView().animate({
      center: fromLonLat([startLng, startLat]),
      zoom: 16,
      duration: 1000
    });
    
    console.log('🚗 Recorrido iniciado en:', { startLng, startLat });
    
    // Iniciar intervalo del recorrido
    this.intervaloRecorrido = setInterval(() => {
      this.avanzarRecorrido();
    }, this.velocidad);
  }

  pausarRecorrido() {
    if (!this.recorridoActivo) return;
    
    this.recorridoPausado = !this.recorridoPausado;
    
    if (this.recorridoPausado) {
      clearInterval(this.intervaloRecorrido);
      console.log('⏸️ Recorrido pausado');
    } else {
      this.intervaloRecorrido = setInterval(() => {
        this.avanzarRecorrido();
      }, this.velocidad);
      console.log('▶️ Recorrido reanudado');
    }
  }

  detenerRecorrido() {
    if (!this.recorridoActivo) return;
    
    this.recorridoActivo = false;
    this.recorridoPausado = false;
    this.mostrarPanelSeleccion = true;
    
    if (this.intervaloRecorrido) {
      clearInterval(this.intervaloRecorrido);
      this.intervaloRecorrido = null;
    }
    
    // Limpiar carro
    this.carroLayer.getSource().clear();
    this.carroFeature = null;
    
    // Reiniciar estadísticas
    this.progreso = 0;
    this.distanciaRecorrida = 0;
    
    // Volver a mostrar la ruta seleccionada
    this.cargarRutaSeleccionadaEnMapa();
    
    console.log('🛑 Recorrido detenido');
  }

  private avanzarRecorrido() {
    if (!this.carroFeature || this.indiceRecorrido >= this.puntosRecorrido.length - 1) {
      this.recorridoCompletado();
      return;
    }

    this.indiceRecorrido++;
    
    const [lon, lat] = this.puntosRecorrido[this.indiceRecorrido];
    const point = new Point(fromLonLat([lon, lat]));
    this.carroFeature.setGeometry(point);
    
    // Calcular ángulo de rotación si hay punto anterior
    if (this.indiceRecorrido > 0) {
      const [prevLon, prevLat] = this.puntosRecorrido[this.indiceRecorrido - 1];
      const angle = this.calcularAngulo(prevLon, prevLat, lon, lat);
      
      // Actualizar estilo con nueva rotación
      const carStyle = new Style({
        image: new Icon({
          src: 'assets/icon/car.svg',
          scale: 0.8,
          anchor: [0.5, 0.5],
          rotateWithView: true,
          rotation: angle
        })
      });
      
      this.carroFeature.setStyle(carStyle);
    }
    
    // Actualizar estadísticas
    this.progreso = (this.indiceRecorrido / (this.puntosRecorrido.length - 1)) * 100;
    this.distanciaRecorrida = this.calcularDistanciaTotal(
      this.puntosRecorrido.slice(0, this.indiceRecorrido + 1)
    );
    
    // Actualizar el source para forzar re-render
    this.carroLayer.getSource().refresh();
    
    // Seguir al carro con el mapa
    const view = this.map?.getView();
    const carPosition = fromLonLat([lon, lat]);
    
    view?.animate({
      center: carPosition,
      duration: 500
    });
    
    console.log(`📍 Carro en posición ${this.indiceRecorrido + 1}/${this.puntosRecorrido.length}:`, { lon, lat });
  }

  private recorridoCompletado() {
    console.log('✅ Recorrido completado');
    
    // Detener el recorrido
    this.detenerRecorrido();
    
    // Mostrar mensaje de completado
    setTimeout(() => {
      this.mostrarAlerta('¡Recorrido Completado!', 'El recorrido ha sido completado exitosamente.');
    }, 500);
  }

  private calcularAngulo(lon1: number, lat1: number, lon2: number, lat2: number): number {
    // Convertir a coordenadas del mapa
    const point1 = fromLonLat([lon1, lat1]);
    const point2 = fromLonLat([lon2, lat2]);
    
    // Calcular ángulo en radianes
    const dx = point2[0] - point1[0];
    const dy = point2[1] - point1[1];
    return Math.atan2(dy, dx);
  }

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

      console.log('📍 Centro en ubicación actual:', { lat, lng });
    } catch (error) {
      console.error('❌ Error obteniendo ubicación actual:', error);
      this.mostrarAlerta('Error', 'No se pudo obtener la ubicación actual');
    }
  }

  recargarRutas() {
    this.cargarRutasDisponibles();
  }

  mostrarOtraRuta() {
    this.detenerRecorrido();
    this.rutaSeleccionada = null;
    this.rutaSeleccionadaLayer.getSource().clear();
    this.puntosLayer.getSource().clear();
    this.carroLayer.getSource().clear();
    this.mostrarPanelSeleccion = true;
  }

  togglePanelSeleccion() {
    this.mostrarPanelSeleccion = !this.mostrarPanelSeleccion;
  }

  private async mostrarAlerta(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ['OK']
    });

    await alert.present();
  }
}