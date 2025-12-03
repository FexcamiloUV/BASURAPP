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
  private velocidad: number = 300; // ms entre puntos
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
      source: new VectorSource(),
      zIndex: 100 // Asegurar que esté por encima de otras capas
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

    // Listener para debug
    this.carroLayer.getSource().on('addfeature', (event: { feature: { getGeometry: () => any; }; }) => {
      console.log('✅ Feature de carro añadido:', event.feature);
      console.log('Geometría del feature:', event.feature.getGeometry());
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
      console.log('Primer punto:', this.puntosRecorrido[0]);
      console.log('Último punto:', this.puntosRecorrido[this.puntosRecorrido.length - 1]);
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

  // Método para crear el carro con SVG inline - CORREGIDO
  private crearObjetoCarro(lng: number, lat: number): void {
    // Verificar coordenadas
    console.log('🚗 Creando carro en:', { lng, lat });
    
    if (!lng || !lat) {
      console.error('❌ Coordenadas inválidas para crear el carro');
      return;
    }
    
    // Crear icono del carro
    const carIcon = new Icon({
      src:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="12" width="24" height="10" rx="2" fill="#3880ff" stroke="#000" stroke-width="1"/>
          <circle cx="10" cy="24" r="3" fill="#333"/>
          <circle cx="22" cy="24" r="3" fill="#333"/>
          <rect x="8" y="8" width="16" height="4" fill="#3880ff" stroke="#000" stroke-width="1"/>
          <rect x="12" y="14" width="8" height="4" fill="#fff" stroke="#000" stroke-width="0.5"/>
        </svg>
      `),
      scale: 1.5, // Aumentado para mejor visibilidad
      anchor: [0.5, 0.5],
      rotateWithView: true
    });

    // Crear feature con la posición correcta
    const startPoint = new Point(fromLonLat([lng, lat]));
    this.carroFeature = new Feature({
      geometry: startPoint,
      name: "carro",
    });

    this.carroFeature.setStyle(new Style({ image: carIcon }));
    
    // Limpiar capa y agregar el carro
    this.carroLayer.getSource().clear();
    this.carroLayer.getSource().addFeature(this.carroFeature);
    
    console.log('✅ Carro creado con geometría:', this.carroFeature.getGeometry());
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
    
    // Obtener primer punto
    const [startLng, startLat] = this.puntosRecorrido[0];
    
    // Verificar coordenadas del primer punto
    console.log('🎬 Iniciando recorrido en:', { startLng, startLat });
    
    // Crear feature del carro en la posición correcta - CORREGIDO
    this.crearObjetoCarro(startLng, startLat);
    
    // Forzar actualización y verificar
    this.carroLayer.changed();
    
    // Verificar que el carro se agregó
    setTimeout(() => {
      const features = this.carroLayer.getSource().getFeatures();
      console.log('🔍 Verificación - Features en carroLayer:', features.length);
      
      if (features.length > 0) {
        const feature = features[0];
        const geometry = feature.getGeometry();
        if (geometry) {
          console.log('✅ Geometría del carro:', geometry.getCoordinates());
        } else {
          console.error('❌ El feature no tiene geometría');
        }
        
        // Verificar estilo
        const style = feature.getStyle();
        console.log('🎨 Estilo del carro:', style ? 'Presente' : 'Ausente');
      } else {
        console.error('❌ No hay features en la capa del carro');
      }
    }, 100);
    
    // Centrar en el inicio de la ruta
    this.map?.getView().animate({
      center: fromLonLat([startLng, startLat]),
      zoom: 16,
      duration: 1000
    });
    
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
    this.indiceRecorrido = 0;
    
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
    console.log(`📍 Moviendo carro a punto ${this.indiceRecorrido}:`, { lon, lat });
    
    const point = new Point(fromLonLat([lon, lat]));
    this.carroFeature.setGeometry(point);
    
    // Calcular ángulo de rotación si hay punto anterior
    if (this.indiceRecorrido > 0) {
      const [prevLon, prevLat] = this.puntosRecorrido[this.indiceRecorrido - 1];
      const angle = this.calcularAngulo(prevLon, prevLat, lon, lat);
      
      console.log(`🎯 Ángulo de rotación: ${(angle * 180 / Math.PI).toFixed(1)}°`);
      
      // Crear nuevo icono con la rotación aplicada
      const carIcon = new Icon({
        src:
          "data:image/svg+xml;utf8," +
          encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="12" width="24" height="10" rx="2" fill="#3880ff" stroke="#000" stroke-width="1"/>
            <circle cx="10" cy="24" r="3" fill="#333"/>
            <circle cx="22" cy="24" r="3" fill="#333"/>
            <rect x="8" y="8" width="16" height="4" fill="#3880ff" stroke="#000" stroke-width="1"/>
            <rect x="12" y="14" width="8" height="4" fill="#fff" stroke="#000" stroke-width="0.5"/>
          </svg>
        `),
        scale: 1.5,
        anchor: [0.5, 0.5],
        rotateWithView: true,
        rotation: angle
      });
      
      this.carroFeature.setStyle(new Style({ image: carIcon }));
    }
    
    // Actualizar estadísticas
    this.progreso = (this.indiceRecorrido / (this.puntosRecorrido.length - 1)) * 100;
    this.distanciaRecorrida = this.calcularDistanciaTotal(
      this.puntosRecorrido.slice(0, this.indiceRecorrido + 1)
    );
    
    // Forzar actualización del render - IMPORTANTE
    this.carroLayer.getSource().refresh();
    this.carroLayer.changed();
    
    // Seguir al carro con el mapa
    const view = this.map?.getView();
    const carPosition = fromLonLat([lon, lat]);
    
    view?.animate({
      center: carPosition,
      duration: 500,
      zoom: 16
    });
    
    console.log(`📍 Carro en posición ${this.indiceRecorrido + 1}/${this.puntosRecorrido.length}:`, { 
      lon, lat,
      progreso: `${this.progreso.toFixed(1)}%`,
      distancia: `${this.distanciaRecorrida.toFixed(2)} km`
    });
  }

  private recorridoCompletado() {
    console.log('✅ Recorrido completado');
    
    // Detener el recorrido
    this.detenerRecorrido();
    
    // Mostrar mensaje de completado
    setTimeout(() => {
      this.mostrarAlerta('¡Recorrido Completado!', 
        `El recorrido ha sido completado exitosamente.\n\n` +
        `Distancia total: ${this.distanciaTotal.toFixed(2)} km\n` +
        `Tiempo estimado: ${((this.puntosRecorrido.length * this.velocidad) / 1000 / 60).toFixed(1)} minutos`
      );
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

  // Método para probar el icono del carro - MEJORADO
  probarIconoCarro() {
    console.log('🧪 Probando icono del carro...');
    
    // Usar coordenadas reales de Buenaventura
    const testLng = -77.0797;
    const testLat = 3.8836;
    
    // Crear feature de prueba
    const testFeature = new Feature({
      geometry: new Point(fromLonLat([testLng, testLat]))
    });
    
    // Crear icono de prueba
    const carIcon = new Icon({
      src:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="12" width="24" height="10" rx="2" fill="#FF0000" stroke="#000" stroke-width="2"/>
          <circle cx="10" cy="24" r="3" fill="#FF9900"/>
          <circle cx="22" cy="24" r="3" fill="#FF9900"/>
          <rect x="8" y="8" width="16" height="4" fill="#FF0000" stroke="#000" stroke-width="2"/>
          <rect x="12" y="14" width="8" height="4" fill="#00FF00" stroke="#000" stroke-width="1"/>
        </svg>
      `),
      scale: 2.0, // Más grande para prueba
      anchor: [0.5, 0.5],
    });
    
    testFeature.setStyle(new Style({ image: carIcon }));
    
    this.carroLayer.getSource().clear();
    this.carroLayer.getSource().addFeature(testFeature);
    
    // Centrar en el carro de prueba
    this.map?.getView().animate({
      center: fromLonLat([testLng, testLat]),
      zoom: 18,
      duration: 1000
    });
    
    console.log('✅ Carro de prueba creado (color rojo brillante)');
  }

  // Nuevo método para debug visual
  mostrarInfoDebug() {
    console.log('=== DEBUG INFO ===');
    console.log('Mapa:', this.map ? 'Creado' : 'No creado');
    console.log('Capa carro visible:', this.carroLayer.getVisible());
    console.log('Features en capa carro:', this.carroLayer.getSource().getFeatures().length);
    console.log('Carro feature:', this.carroFeature ? 'Presente' : 'Ausente');
    
    if (this.carroFeature) {
      console.log('Geometría carro:', this.carroFeature.getGeometry());
      console.log('Estilo carro:', this.carroFeature.getStyle());
    }
    
    console.log('Recorrido activo:', this.recorridoActivo);
    console.log('Puntos recorrido:', this.puntosRecorrido.length);
    console.log('==================');
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