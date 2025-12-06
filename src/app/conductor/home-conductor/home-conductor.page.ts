import { Component, inject, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonCardContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonLabel,
  IonFooter,
  IonTabBar,
  IonTabButton,
  IonButtons,
  IonBadge,
  IonSpinner,
  IonList,
  IonMenu,
  IonItem,
  NavController,
  IonMenuToggle,
  IonMenuButton,
  IonSegment,
  IonSegmentButton,
} from "@ionic/angular/standalone";
import { Geolocation } from "@capacitor/geolocation";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Style, Stroke, Icon } from "ol/style";
import { LineString, Point } from "ol/geom";
import { Feature } from "ol";
import { Rutas } from "src/interfaces/rutas";
import { CargaDatos } from "src/service/datos/cargar-datos";
import { AlertController } from "@ionic/angular/standalone";
import { MenuController } from "@ionic/angular";
import { Vehiculos } from "src/interfaces/vehiculos";
import { addIcons } from "ionicons";
import {
  menu,
  navigate,
  notifications,
  map,
  carSport,
  informationCircle,
  pulse,
  time,
  trailSign,
  location,
  speedometer,
  people,
  logOut,
  car,
  person,
  play,
  stop,
  radio,
  cellular,
} from "ionicons/icons";
import { AuthService } from "src/service/Auth/auth-service";

// Importar Supabase
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { environment } from "src/environments/environment";

interface PuntoRecorrido {
  id: number;
  lat: number;
  lng: number;
  calle: string;
  timestamp: Date;
  orden: number;
}

interface UbicacionEnTiempoReal {
  conductor_id: string;
  vehiculo_id: string;
  recorrido_id: string;
  lat: number;
  lng: number;
  velocidad?: number;
  precision?: number;
  timestamp: string;
}
interface Posicion {
  lat: number;
  lon: number;
  perfil_id: string;
}

@Component({
  selector: "app-home-conductor",
  templateUrl: "./home-conductor.page.html",
  styleUrls: ["./home-conductor.page.scss"],
  standalone: true,
  imports: [
    IonItem,
    IonList,
    IonSpinner,
    IonBadge,
    IonButtons,
    IonTabButton,
    IonTabBar,
    IonFooter,
    IonLabel,
    IonIcon,
    IonCardTitle,
    IonCardHeader,
    IonCard,
    IonCardContent,
    IonButton,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    CommonModule,
    FormsModule,
    IonMenu,
    IonMenuToggle,
    IonMenuButton,
  ],
})
export class HomeConductorPage implements OnInit, OnDestroy {
  isLoading = true;
  cargandoRutas = false;
  private datos = inject(CargaDatos);
  alertMessage = "";
  showAlert = false;
  private alertController = inject(AlertController);
  currentLocation: { lat: number; lng: number } | null = null;
  private map: Map | undefined;
  rutasGuardadas: Rutas[] = [];
  rutaSeleccionada: Rutas | null = null;
  markerLayer: any;
  routeLayer: any;
  private rutasLayer: any;
  private carLayer: any;
  modoRecorrido = false;
  recorridoPuntos: number[][] = [];
  puntosRecorrido: PuntoRecorrido[] = [];
  private carFeature: any;
  
  // ⚡ NUEVO: Modo de operación (tiempo real vs simulación)
  public modoOperacion: 'tiempo-real' | 'simulacion' = 'tiempo-real';
  
  // Variables para simulación
  private recorridoInterval: any;
  
  rutasVisibles = true;
  puntosRutaActual: number[][] = [];
  indicePuntoActual: number = 0;
  private cargaDatos = inject(CargaDatos);
  userRole = "";
  userName = "";
  private recorridoId: string | null = null;
  vehiculoId!: Vehiculos["id"];
  private authService = inject(AuthService);
  private nav = inject(NavController);
  private menu = inject(MenuController);
  private perfilId: string = "c14fb089-0812-4ba8-8a35-32ba08e35ce6"; 
  vehiculo!: Vehiculos[];
  vehiculoSeleccionado: any;

  // Variables para WebSockets y ubicación en tiempo real
  private supabase: any;
  private ubicacionChannel: RealtimeChannel | null = null;
  private watchPositionId: string | null = null;
  private isWebSocketConnected = false;
  private lastSentLocation: { lat: number; lng: number } | null = null;
  private minDistanceForUpdate = 10; // metros mínimos para enviar actualización

  // ⏰ Temporizador de prueba de 5 minutos
  private pruebaTimer: any;
  public tiempoRestante: number = 300; // 5 minutos en segundos
  public pruebaActiva: boolean = false;

  // Variables para seguimiento de progreso de ruta
  private rutaCompletada: boolean = false;
  public progresoRuta: number = 0; // Porcentaje de progreso
  public distanciaAlFinal: number = 0; // Distancia al punto final en metros

  constructor() {
    addIcons({
      person,
      map,
      logOut,
      menu,
      navigate,
      notifications,
      carSport,
      informationCircle,
      pulse,
      time,
      trailSign,
      location,
      speedometer,
      people,
      car,
      play,
      stop,
      radio,
      cellular,
    });

    // Inicializar Supabase (REEMPLAZA CON TUS CREDENCIALES REALES)
    this.initializeSupabase();
  }

  private async initializeMapIfNeeded() {
  // Si el mapa ya existe, limpiarlo antes de recrear
  if (this.map) {
    this.map.setTarget(undefined);
    this.map = undefined;
  }
  
  // Limpiar todas las capas
  this.limpiarTodasLasCapas();
}

private limpiarTodasLasCapas() {
  if (this.markerLayer) {
    this.markerLayer.getSource()?.clear();
  }
  if (this.routeLayer) {
    this.routeLayer.getSource()?.clear();
  }
  if (this.rutasLayer) {
    this.rutasLayer.getSource()?.clear();
  }
  if (this.carLayer) {
    this.carLayer.getSource()?.clear();
  }
}
  private initializeSupabase() {
    try {
      // ⚠️ REEMPLAZA CON TUS CREDENCIALES REALES DE SUPABASE
      const supabaseUrl = environment.supabaseUrl; // TU URL REAL
      const supabaseKey = environment.supabaseKey; // TU KEY REAL
      
      // Validar que no sean placeholders
      if (supabaseUrl.includes('tu-proyecto-real') || supabaseKey.includes('tu-anon-key-real')) {
        console.warn('⚠️ CONFIGURA TUS CREDENCIALES REALES DE SUPABASE');
        console.warn('Ve a: Settings → API en tu proyecto de Supabase');
        return;
      }
      
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('🔌 Supabase inicializado para tiempo real');
    } catch (error) {
      console.error('❌ Error inicializando Supabase:', error);
    }
  }

  async ngOnInit() {
    await this.MostrarMapa();
    await this.loadUserData();
    await this.cargarRutasGuardadas();
    await this.obtenerVehiculos();
  }

  ngOnDestroy() {
    this.cleanupWebSocketConnection();
    this.stopLocationTracking();
    this.detenerRecorrido();
    this.detenerTemporizadorPrueba();
  }

  // ==================== SELECTOR DE MODO DE OPERACIÓN ====================

  async MostrarMapa() {
  this.isLoading = true;

  try {
    // ✅ VERIFICAR SI EL MAPA YA EXISTE
    if (!this.map) {
      await this.initializeMapIfNeeded();
    }

    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    });

    const lat = coordinates.coords.latitude;
    const lng = coordinates.coords.longitude;

    console.log("📍 Ubicación REAL obtenida:", { lat, lng });
    this.currentLocation = { lat, lng };

    // ✅ SI EL MAPA NO EXISTE, INICIALIZARLO
    if (!this.map) {
      this.initializeMap(lng, lat);
    } else {
      // ✅ SI EXISTE, SOLO ACTUALIZAR LA VISTA
      this.map.getView().animate({
        center: fromLonLat([lng, lat]),
        zoom: 15,
        duration: 1000,
      });
    }
  } catch (error) {
    console.error("❌ Error obteniendo ubicación:", error);
    console.log("🗺️ Usando ubicación por defecto: Buenaventura");
    
    // ✅ INICIALIZAR MAPA CON UBICACIÓN POR DEFECTO SI NO EXISTE
    if (!this.map) {
      this.initializeMap(-77.0797, 3.8836);
    }
  } finally {
    this.isLoading = false;
  }
}


  private initializeMap(lng: number, lat: number): void {
     // ✅ VERIFICAR SI EL ELEMENTO DEL MAPA EXISTE
  const mapElement = document.getElementById('mapId');
  if (!mapElement) {
    console.error('❌ Elemento del mapa no encontrado');
    return;
  }

  // ✅ LIMPIAR MAPA ANTERIOR SI EXISTE
  if (this.map) {
    this.map.setTarget(undefined);
    this.map = undefined;
  }

  this.map = new Map({
    target: "mapId", // ✅ ESTO ES CRÍTICO
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
        stroke: new Stroke({ color: "#ff0000", width: 4 }),
      }),
    });

    this.rutasLayer = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        stroke: new Stroke({ color: "#3880ff", width: 3, lineDash: [5, 5] }),
      }),
    });

    this.carLayer = new VectorLayer({ source: new VectorSource() });

    this.map.addLayer(this.markerLayer);
    this.map.addLayer(this.routeLayer);
    this.map.addLayer(this.rutasLayer);
    this.map.addLayer(this.carLayer);

    this.crearObjetoCarro();
  }


  private crearObjetoCarro(): void {
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
      scale: 1.2,
      anchor: [0.5, 0.5],
    });

    this.carFeature = new Feature({
      geometry: new Point(fromLonLat([0, 0])),
      name: "carro",
    });

    this.carFeature.setStyle(new Style({ image: carIcon }));
    this.carFeature.setGeometry(null);
    this.carLayer.getSource().addFeature(this.carFeature);
  }

  async cambiarModoOperacion(event: any) {
    const nuevoModo = event.detail.value;
    
    if (this.modoRecorrido) {
      await this.mostrarAlerta(
        'Modo No Disponible',
        'No puedes cambiar el modo mientras hay un recorrido activo. Detén el recorrido primero.'
      );
      // Revertir el cambio
      event.target.value = this.modoOperacion;
      return;
    }
    
    this.modoOperacion = nuevoModo;
    console.log(`Modo cambiado a: ${this.modoOperacion}`);
    
    await this.mostrarAlerta(
      'Modo Cambiado',
      `Ahora estás en modo: ${this.modoOperacion === 'tiempo-real' ? 'En tiempo Real ' : 'Simulación '}`
    );
  }

  // ==================== SEGUIMIENTO DE PROGRESO DE RUTA ====================

  private actualizarProgresoRuta(lat: number, lng: number) {
    if (!this.puntosRutaActual || this.puntosRutaActual.length === 0) return;

    // Calcular distancia al punto final
    const puntoFinal = this.puntosRutaActual[this.puntosRutaActual.length - 1];
    this.distanciaAlFinal = this.calculateDistance(lat, lng, puntoFinal[1], puntoFinal[0]);

    // Calcular progreso basado en la distancia recorrida vs distancia total
    const distanciaTotal = this.calcularDistanciaTotalRuta();
    const distanciaRecorrida = this.calcularDistanciaRecorrida(lat, lng);
    
    this.progresoRuta = Math.min(100, Math.max(0, (distanciaRecorrida / distanciaTotal) * 100));

    console.log(`📊 Progreso: ${this.progresoRuta.toFixed(1)}% - Distancia al final: ${this.distanciaAlFinal.toFixed(0)}m`);

    // Verificar si llegó al final de la ruta (dentro de 50 metros)
    if (this.distanciaAlFinal <= 50 && !this.rutaCompletada) {
      this.rutaCompletada = true;
      this.finalizarPorCompletarRuta();
    }
  }

  async cargarRutasGuardadas() {
    this.cargandoRutas = true;
    try {
      this.rutasGuardadas = await this.datos.obtenerRutas();
      console.log("📦 Rutas recibidas:", this.rutasGuardadas);

      if (this.rutasGuardadas?.length > 0) {
        this.dibujarRutasGuardadas();
      }
    } catch (error: any) {
      console.error("💥 ERROR:", error);
      this.mostrarAlerta("Error", "Error al cargar rutas");
    } finally {
      this.cargandoRutas = false;
    }
  }

    
   private dibujarRutasGuardadas() {
    if (!this.rutasLayer || !this.rutasGuardadas.length) return;

    this.limpiarRutasGuardadas();

    this.rutasGuardadas.forEach((ruta, index) => {
      this.dibujarRutaOrganizada(ruta, index);
    });
  }

  private dibujarRutaOrganizada(ruta: Rutas, index: number) {
    try {
      const shapeObj = JSON.parse(ruta.shape);
      const estilo = this.obtenerEstiloOrganizado(index);

      if (shapeObj.type === "LineString" && shapeObj.coordinates) {
        this.dibujarSegmento(shapeObj.coordinates, ruta.nombre_ruta, estilo);
      } else if (shapeObj.type === "MultiLineString" && shapeObj.coordinates) {
        shapeObj.coordinates.forEach((segmentoCoords: any[]) => {
          this.dibujarSegmento(segmentoCoords, `${ruta.nombre_ruta}`, estilo);
        });
      }
    } catch (error) {
      console.error("❌ Error dibujando ruta organizada:", error);
    }
  }

  private dibujarSegmento(coordenadas: any[], nombre: string, estilo: any) {
    if (!coordenadas || coordenadas.length < 2) return;

    const coordenadasConvertidas = coordenadas.map((coord: any) => {
      return coord.length === 2 ? fromLonLat(coord) : fromLonLat([0, 0]);
    });

    const lineString = new LineString(coordenadasConvertidas);
    const feature = new Feature({ geometry: lineString, name: nombre });

    feature.setStyle(
      new Style({
        stroke: new Stroke({ color: estilo.color, width: estilo.ancho }),
      })
    );

    this.rutasLayer.getSource().addFeature(feature);
  }

  private obtenerEstiloOrganizado(index: number): any {
    const colores = ["#3880ff", "#10dc60", "#ffce00", "#f04141", "#7044ff"];
    const colorIndex = index % colores.length;

    return { color: colores[colorIndex], ancho: 4 };
  }

  private calcularDistanciaTotalRuta(): number {
    if (!this.puntosRutaActual || this.puntosRutaActual.length < 2) return 0;

    let distanciaTotal = 0;
    for (let i = 1; i < this.puntosRutaActual.length; i++) {
      const puntoAnterior = this.puntosRutaActual[i - 1];
      const puntoActual = this.puntosRutaActual[i];
      distanciaTotal += this.calculateDistance(
        puntoAnterior[1], puntoAnterior[0],
        puntoActual[1], puntoActual[0]
      );
    }
    return distanciaTotal;
  }

  private calcularDistanciaRecorrida(latActual: number, lngActual: number): number {
    if (!this.puntosRutaActual || this.puntosRutaActual.length < 2) return 0;

    let distanciaRecorrida = 0;
    let puntoMasCercano = 0;

    // Encontrar el punto más cercano en la ruta
    let minDistancia = Infinity;
    for (let i = 0; i < this.puntosRutaActual.length; i++) {
      const punto = this.puntosRutaActual[i];
      const distancia = this.calculateDistance(latActual, lngActual, punto[1], punto[0]);
      if (distancia < minDistancia) {
        minDistancia = distancia;
        puntoMasCercano = i;
      }
    }

    // Calcular distancia desde el inicio hasta el punto más cercano
    for (let i = 1; i <= puntoMasCercano; i++) {
      const puntoAnterior = this.puntosRutaActual[i - 1];
      const puntoActual = this.puntosRutaActual[i];
      distanciaRecorrida += this.calculateDistance(
        puntoAnterior[1], puntoAnterior[0],
        puntoActual[1], puntoActual[0]
      );
    }

    return distanciaRecorrida;
  }

  private async finalizarPorCompletarRuta() {
    console.log('🏁 ¡Ruta completada! Llegaste al punto final');
    
    await this.mostrarAlerta(
      '¡Ruta Completada!', 
      'Has llegado al final de la ruta. El recorrido se ha finalizado automáticamente.'
    );
    
    await this.finRecorrido();
  }

  // ==================== TEMPORIZADOR DE PRUEBA ====================

  private iniciarTemporizadorPrueba() {
    this.pruebaActiva = true;
    this.tiempoRestante = 300; // 5 minutos
    this.rutaCompletada = false;
    this.progresoRuta = 0;
    
    this.pruebaTimer = setInterval(() => {
      this.tiempoRestante--;
      
      if (this.tiempoRestante <= 0) {
        this.finalizarPorTiempo();
      }
    }, 1000);
  }

  private detenerTemporizadorPrueba() {
    if (this.pruebaTimer) {
      clearInterval(this.pruebaTimer);
      this.pruebaTimer = null;
    }
    this.pruebaActiva = false;
    this.tiempoRestante = 300;
  }

  private async finalizarPorTiempo() {
    console.log('⏰ Prueba de 5 minutos finalizada automáticamente');
    this.detenerTemporizadorPrueba();
    
    await this.mostrarAlerta(
      'Prueba Finalizada', 
      'La prueba de 5 minutos ha terminado. El recorrido se ha detenido automáticamente.'
    );
    
    await this.finRecorrido();
  }

  // ==================== MODO TIEMPO REAL ====================

  private async initializeWebSocketConnection() {
    if (!this.recorridoId || !this.vehiculoId) {
      console.warn('⚠️ No se puede inicializar WebSocket sin recorridoId y vehiculoId');
      return;
    }

    try {
      // Limpiar conexión anterior si existe
      this.cleanupWebSocketConnection();

      // Crear canal de WebSocket para este recorrido
      this.ubicacionChannel = this.supabase
        .channel(`recorrido:${this.recorridoId}`)
        .on('broadcast', { event: 'ubicacion_actualizada' }, (payload: any) => {
          console.log('📍 Ubicación recibida de otros conductores:', payload);
        })
        .subscribe((status: string) => {
          console.log('🔌 Estado de WebSocket:', status);
          this.isWebSocketConnected = status === 'SUBSCRIBED';
        });

      console.log('✅ WebSocket conectado para el recorrido:', this.recorridoId);
    } catch (error) {
      console.error('❌ Error conectando WebSocket:', error);
    }
  }

  private cleanupWebSocketConnection() {
    if (this.ubicacionChannel) {
      this.supabase.removeChannel(this.ubicacionChannel);
      this.ubicacionChannel = null;
    }
    this.isWebSocketConnected = false;
  }

  private async startRealTimeLocationTracking() {
    if (!this.recorridoId || !this.vehiculoId) {
      console.warn('⚠️ No se puede iniciar tracking sin recorridoId y vehiculoId');
      return;
    }

    try {
      // Inicializar WebSocket
      await this.initializeWebSocketConnection();

      // Configurar seguimiento de ubicación en tiempo real
      this.watchPositionId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        },
        (position, err) => {
          if (err) {
            console.error('❌ Error en watchPosition:', err);
            return;
          }

          if (position) {
            this.handleNewLocation(position);

          }
        }
      );

      console.log('📍 Seguimiento de ubicación en tiempo real iniciado');
    } catch (error) {
      console.error('❌ Error iniciando seguimiento de ubicación:', error);
    }
  }

 

  private shouldSendLocationUpdate(newLocation: any): boolean {
    if (!this.lastSentLocation) return true;

    const distance = this.calculateDistance(
      this.lastSentLocation.lat,
      this.lastSentLocation.lng,
      newLocation.lat,
      newLocation.lng
    );

    return distance >= this.minDistanceForUpdate;
  }




// Reemplaza completamente la función sendToExternalAPI
private async handleNewLocation(position: any) {
  console.log('🔍 handleNewLocation INICIADO');
  
  // Solo procesar si estamos en modo tiempo real
  if (this.modoOperacion !== 'tiempo-real') {
    console.log('⚠️ No es modo tiempo-real, ignorando');
    return;
  }

  const newLocation = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    speed: position.coords.speed || 0,
    timestamp: new Date(position.timestamp)
  };

  console.log('📍 newLocation creado:', {
    lat: newLocation.lat,
    lng: newLocation.lng,
    'lat tipo': typeof newLocation.lat,
    'lng tipo': typeof newLocation.lng
  });

  // Actualizar ubicación en el mapa
  this.actualizarPosicionCarro(newLocation.lng, newLocation.lat);

  // Actualizar progreso de la ruta
  this.actualizarProgresoRuta(newLocation.lat, newLocation.lng);

  // Verificar si debemos enviar la ubicación al servidor
  console.log('📝 Verificando shouldSendLocationUpdate...');
  if (this.shouldSendLocationUpdate(newLocation)) {
    console.log('🚀 Debe enviar, llamando sendLocationToServer...');
    await this.sendLocationToServer(newLocation);
    this.lastSentLocation = { lat: newLocation.lat, lng: newLocation.lng };
  } else {
    console.log('⏭️ No envía (distancia insuficiente)');
  }

  // Actualizar la ubicación actual
  this.currentLocation = { lat: newLocation.lat, lng: newLocation.lng };

  // Dibujar el recorrido actual
  this.recorridoPuntos.push([newLocation.lng, newLocation.lat]);
  this.dibujarRecorridoActual();
  
  console.log('✅ handleNewLocation COMPLETADO');
}

private async sendLocationToServer(location: any) {
  console.log('🔍 sendLocationToServer INICIADO');
  console.log('🔍 Location recibida:', {
    lat: location.lat,
    lng: location.lng,
    'tipo': typeof location
  });
  
  if (!this.recorridoId || !this.vehiculoId) {
    console.error('❌ ERROR: No hay recorridoId o vehiculoId');
    return;
  }

  try {
    const ubicacionData: UbicacionEnTiempoReal = {
      conductor_id: this.perfilId,
      vehiculo_id: this.vehiculoId,
      recorrido_id: this.recorridoId,
      lat: location.lat,
      lng: location.lng,
      velocidad: location.speed || 0,
      precision: location.accuracy,
      timestamp: new Date().toISOString()
    };

    console.log('📦 UbicacionData creada:', ubicacionData);

    const promises: Promise<any>[] = [];

    // 1. WebSocket
    if (this.ubicacionChannel) {
      promises.push(
        this.ubicacionChannel.send({
          type: 'broadcast',
          event: 'ubicacion_actualizada',
          payload: ubicacionData
        })
      );
    }

    // 2. Supabase
    promises.push(
      this.supabase
        .from('ubicaciones_conductor')
        .insert([ubicacionData])
        .then(({ error }: { error: any }): void => {
          if (error) throw error;
          console.log('✅ Ubicación guardada en Supabase');
        })
    );

    // 3. API Externa - ¡PASANDO EL MISMO OBJETO location!
    console.log('📤 Pasando location a sendToExternalAPI:', location);
    promises.push(this.sendToExternalAPI(location));

    console.log('🔄 Ejecutando todas las promesas...');
    await Promise.all(promises);

    console.log('✅ sendLocationToServer COMPLETADO');

  } catch (error) {
    console.error('❌ Error en sendLocationToServer:', error);
  }
}

private async sendToExternalAPI(location: any): Promise<any> {
  console.log('🔍 sendToExternalAPI - location:', location);
  
  if (!this.recorridoId || !this.perfilId) {
    console.error('❌ Faltan parámetros');
    return null;
  }

  // EXTRAER VALORES DE MANERA SEGURA
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  
  console.log('📊 Valores extraídos:', { lat, lng });
  
  // VALIDACIÓN ESTRICTA
  if (isNaN(lat) || isNaN(lng)) {
    console.error('❌ ERROR: Coordenadas no son números');
    console.error('   location.lat:', location?.lat, '(tipo:', typeof location?.lat, ')');
    console.error('   location.lng:', location?.lng, '(tipo:', typeof location?.lng, ')');
    return null;
  }

  // CREAR OBJETO
  const posicion: Posicion = {
    lat: lat,
    lon: lng,
    perfil_id: this.perfilId
  };

  console.log('🚀 Enviando posicion:', posicion);
  console.log('📝 JSON:', JSON.stringify(posicion));

  try {
    const resultado = await this.datos.enviarPosicion(this.recorridoId, posicion);
    console.log('✅ Resultado:', resultado);
    return resultado;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}
  // ==================== MODO SIMULACIÓN ====================

  private iniciarSimulacionRecorrido() {
    console.log('🎮 Iniciando simulación de recorrido');
    
    // Reiniciar variables de simulación
    this.indicePuntoActual = 0;
    this.recorridoPuntos = [];
    this.rutaCompletada = false;
    this.progresoRuta = 0;

    // Posicionar el carro en el primer punto de la ruta
    const primerPunto = this.puntosRutaActual[0];
    this.actualizarPosicionCarro(primerPunto[0], primerPunto[1]);
    this.recorridoPuntos.push(primerPunto);

    // Iniciar simulación de movimiento (más rápido para pruebas)
    this.recorridoInterval = setInterval(() => {
      this.simularMovimiento();
    }, 2000); // 2 segundos entre puntos

    console.log('🚗 Simulación iniciada - Moviéndose por la ruta...');
  }

  private async simularMovimiento() {
    // Solo simular si estamos en modo simulación
    if (this.modoOperacion !== 'simulacion') return;

    if (this.indicePuntoActual >= this.puntosRutaActual.length - 1) {
      console.log("🏁 Simulación completada - Llegó al final de la ruta");
      await this.finRecorrido();
      return;
    }

    this.indicePuntoActual++;
    const puntoActual = this.puntosRutaActual[this.indicePuntoActual];

    // Actualizar posición del carro
    this.actualizarPosicionCarro(puntoActual[0], puntoActual[1]);
    this.recorridoPuntos.push(puntoActual);
    this.dibujarRecorridoActual();

    // Actualizar progreso
    this.actualizarProgresoRuta(puntoActual[1], puntoActual[0]);

    // Simular envío al servidor (opcional para pruebas)
    await this.simularEnvioUbicacion(puntoActual);

    console.log(`🎮 Simulación - Punto ${this.indicePuntoActual + 1}/${this.puntosRutaActual.length}`);
  }

  private async simularEnvioUbicacion(punto: number[]) {
    // Simular envío al servidor sin WebSockets reales
    const ubicacionSimulada = {
      lat: punto[1],
      lng: punto[0],
      velocidad: 30 + Math.random() * 20, // Velocidad aleatoria
      precision: 5,
      timestamp: new Date().toISOString()
    };

    console.log('🎮 Ubicación simulada enviada:', ubicacionSimulada);
  }

  // ==================== MÉTODOS COMUNES ====================

  private stopLocationTracking() {
    // Detener el watch de geolocalización
    if (this.watchPositionId) {
      Geolocation.clearWatch({ id: this.watchPositionId });
      this.watchPositionId = null;
    }

    // Limpiar WebSocket
    this.cleanupWebSocketConnection();

    console.log('📍 Seguimiento de ubicación detenido');
  }

  private stopSimulation() {
    // Detener la simulación
    if (this.recorridoInterval) {
      clearInterval(this.recorridoInterval);
      this.recorridoInterval = null;
    }

    console.log('🎮 Simulación detenida');
  }

  private async iniciarRecorridoRuta() {
    if (this.puntosRutaActual.length === 0) {
      console.error("❌ No hay puntos en la ruta seleccionada");
      return;
    }

    try {
      // 1. Llamar al servicio para iniciar el recorrido en el backend
      const recorridoData = {
        ruta_id: this.rutaSeleccionada!.id.toString(),
        vehiculo_id: this.vehiculoId,
        perfil_id: this.perfilId,
      };

      console.log("📡 Enviando datos al servidor:", recorridoData);

      const response = await this.datos.iniciarRecorrido(recorridoData);

      this.recorridoId = response.id || response.recorrido_id;
      console.log("✅ Recorrido iniciado en servidor. ID:", this.recorridoId);

      // 2. INICIAR SEGUIMIENTO SEGÚN EL MODO
      if (this.modoOperacion === 'tiempo-real') {
        await this.startRealTimeLocationTracking();
        await this.mostrarAlerta(
          'Modo Tiempo Real Iniciado',
          'Se ha iniciado el seguimiento en tiempo real. Tu ubicación GPS se está enviando al servidor.\n\nEl recorrido terminará automáticamente cuando completes la ruta o se agote el tiempo.'
        );
      } else {
        this.iniciarSimulacionRecorrido();
        await this.mostrarAlerta(
          'Modo Simulación Iniciado',
          'Se ha iniciado la simulación. El vehículo se moverá automáticamente por la ruta.\n\nPerfecto para pruebas y demostraciones.'
        );
      }

      // 3. INICIAR TEMPORIZADOR DE PRUEBA DE 5 MINUTOS
      this.iniciarTemporizadorPrueba();

      // 4. Mostrar carro en el primer punto
      const primerPunto = this.puntosRutaActual[0];
      this.actualizarPosicionCarro(primerPunto[0], primerPunto[1]);
      this.recorridoPuntos = [primerPunto];

    } catch (error) {
      console.error("❌ Error al iniciar recorrido en servidor:", error);
      await this.mostrarAlerta(
        "Error",
        "No se pudo iniciar el recorrido en el servidor"
      );
      this.modoRecorrido = false;
    }
  }

  private async detenerRecorrido() {
    // Detener según el modo actual
    if (this.modoOperacion === 'tiempo-real') {
      this.stopLocationTracking();
    } else {
      this.stopSimulation();
    }

    // Detener temporizador de prueba
    this.detenerTemporizadorPrueba();

    // Limpiar variables
    this.recorridoId = null;
    this.modoRecorrido = false;
    this.lastSentLocation = null;
    this.rutaCompletada = false;
    this.progresoRuta = 0;
    this.distanciaAlFinal = 0;

    console.log("🛑 Recorrido detenido completamente");
    this.finalizarPorCompletarRuta();
  }

  // ==================== MÉTODOS DEL MAPA ====================

  private actualizarPosicionCarro(lng: number, lat: number): void {
    if (!this.carFeature) return;

    const coordinates = fromLonLat([lng, lat]);
    this.carFeature.setGeometry(new Point(coordinates));

    // Centrar el mapa en el carro (suave)
    if (this.map) {
      this.map.getView().animate({
        center: coordinates,
        duration: 1000,
      });
    }
  }

  private dibujarRecorridoActual() {
    if (!this.routeLayer || this.recorridoPuntos.length < 2) return;

    this.routeLayer.getSource().clear();

    const coordenadasConvertidas = this.recorridoPuntos.map((coord) =>
      fromLonLat(coord)
    );

    const lineString = new LineString(coordenadasConvertidas);
    const feature = new Feature({ geometry: lineString });

    feature.setStyle(
      new Style({
        stroke: new Stroke({ 
          color: this.modoOperacion === 'tiempo-real' ? "#ff0000" : "#ff9900", 
          width: 4 
        }),
      })
    );

    this.routeLayer.getSource().addFeature(feature);
  }

  // ... (el resto de los métodos existentes se mantienen igual)

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
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
    return degrees * (Math.PI/180);
  }

    async logout() {
    // Cerrar el menú (si está abierto) y confirmar con el usuario antes de cerrar sesión
    try {
      await this.menu.close();
    } catch (e) {
      // ignora si no hay menú abierto
    }
    // Confirmar con el usuario antes de cerrar sesión
    const confirm = await this.alertController.create({
      header: "Cerrar sesión",
      message: "¿Estás seguro que deseas cerrar sesión?",
      buttons: [
        { text: "Cancelar", role: "cancel" },
        {
          text: "Cerrar sesión",
          handler: () => {
            // Ejecutar el cierre en una IIFE async (handler no puede ser async directamente)
            void (async () => {
              this.isLoading = true;
              try {
                // Llamada al servicio de autenticación
                await this.authService.logout();

                // Limpieza local de datos sensibles
                localStorage.removeItem("token");
                localStorage.removeItem("user"); // ajustar según keys reales
                // Si deseas eliminar todo: localStorage.clear();

                // Limpiar y destruir el mapa para evitar fugas
                try {
                  this.markerLayer?.getSource()?.clear?.();
                  this.routeLayer?.getSource()?.clear?.();
                  this.rutasLayer?.getSource()?.clear?.();
                  if (this.map) {
                    this.map.setTarget(undefined);
                    this.map = undefined;
                  }
                } catch (mapErr) {
                  console.warn("Error limpiando mapa durante logout:", mapErr);
                }

                // Navegar reiniciando el historial (no permitir volver atrás)
                await this.nav.navigateRoot("/login");
              } catch (error) {
                console.error("Error al cerrar sesión:", error);
                await this.mostrarAlerta(
                  "Error",
                  "No se pudo cerrar sesión. Intenta de nuevo."
                );
              } finally {
                this.isLoading = false;
              }
            })();
          },
        },
      ],
    });

    await confirm.present();
  }
  async loadUserData() {
    this.userName = await this.authService.getUserName();
  }

    async mostrarAlerta(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ["OK"],
    });
    await alert.present();
  }

     limpiarRutasGuardadas() {
    if (this.rutasLayer) {
      this.rutasLayer.getSource().clear();
    }
  }

    async finRecorrido() {
    if (!this.recorridoId) {
      await this.mostrarAlerta(
        "Error",
        "No hay un recorrido activo para finalizar."
      );
      return;
    }

    try {
      // ✅ Ahora pasamos ambos parámetros: recorridoId y perfilId
      await this.datos.finalizarRecorrido(this.recorridoId, this.perfilId);
      console.log(
        "✅ Recorrido finalizado en el servidor. ID:",
        this.recorridoId
      );
      await this.mostrarAlerta(
        "Recorrido",
        "El recorrido ha sido finalizado correctamente."
      );

      // Limpiar estado
      this.recorridoId = null;
      this.modoRecorrido = false;
      this.detenerRecorrido();
    } catch (error) {
      console.error("❌ Error al finalizar recorrido en el servidor:", error);
      await this.mostrarAlerta(
        "Error",
        "No se pudo finalizar el recorrido en el servidor."
      );
    }
  }
   async seleccionarVehiculo(event: any) {
    this.vehiculoId = event.detail.value;
      this.vehiculoSeleccionado = this.vehiculo.find(v => v.id === this.vehiculoId);
    console.log("🚗 Vehículo seleccionado para el recorrido:", this.vehiculoId);
  }

  async seleccionarRuta(event: any) {
  const rutaId = event.detail.value;
  this.rutaSeleccionada =
    this.rutasGuardadas.find((ruta) => ruta.id === rutaId) || null;

  if (this.rutaSeleccionada) {
    console.log(
      "🛣️ Ruta seleccionada para recorrido:",
      this.rutaSeleccionada.nombre_ruta
    );
    // ✅ FALTA ESTA LÍNEA - AGREGALA
    this.cargarPuntosRuta(this.rutaSeleccionada);
  } else {
    console.warn("⚠️ Ruta no encontrada para el ID seleccionado:", rutaId);
    this.puntosRutaActual = [];
  }
}

  private cargarPuntosRuta(ruta: Rutas) {
  try {
    const shapeObj = JSON.parse(ruta.shape);
    this.puntosRutaActual = [];

    if (shapeObj.type === "LineString" && shapeObj.coordinates) {
      this.puntosRutaActual = shapeObj.coordinates;
    } else if (shapeObj.type === "MultiLineString" && shapeObj.coordinates) {
      this.puntosRutaActual = shapeObj.coordinates[0];
    }

    console.log(
      `📍 Ruta "${ruta.nombre_ruta}" cargada con ${this.puntosRutaActual.length} puntos`
    );

    if (this.puntosRutaActual.length > 0) {
      const primerPunto = this.puntosRutaActual[0];
      this.map?.getView().animate({
        center: fromLonLat(primerPunto),
        zoom: 15,
        duration: 1000,
      });
    }
  } catch (error) {
    console.error("❌ Error cargando puntos de ruta:", error);
  }
}
  async toggleRecorridoMode() {
  if (!this.rutaSeleccionada) {
    await this.mostrarAlerta(
      "Error",
      "Por favor selecciona una ruta primero"
    );
    return;
  }

  if (!this.vehiculoId) {
    await this.mostrarAlerta(
      "Error",
      "Por favor selecciona un vehículo primero"
    );
    return;
  }

  this.modoRecorrido = !this.modoRecorrido;

  if (this.modoRecorrido) {
    console.log(
      `🚗 Iniciando recorrido en modo ${this.modoOperacion.toUpperCase()}:`,
      this.rutaSeleccionada.nombre_ruta
    );
    await this.iniciarRecorridoRuta();
  } else {
    console.log("🚗 Deteniendo recorrido");
    await this.detenerRecorrido();
  }
}
    async obtenerVehiculos() {
    this.vehiculo = await this.cargaDatos.obtenerVehiculos();
    console.log("Vehiculos Disponibles", this.vehiculo);
  }
}