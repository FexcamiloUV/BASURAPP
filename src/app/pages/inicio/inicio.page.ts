import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonImg,
  IonButton,
  IonButtons,
  IonMenuButton,
  IonMenu,
  IonItem,
  IonIcon,
  IonLabel,
  IonAvatar,
  IonList,
  IonApp,
  IonTabButton,
  IonText,
  IonCard,
  IonFooter,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons/";
import { notifications } from "ionicons/icons";
import { CargaDatos } from "src/service/datos/cargar-datos";
import { Geolocation } from "@capacitor/geolocation";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat, toLonLat } from "ol/proj";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import { Coordinate } from "ol/coordinate";
import { Calles } from "../../../interfaces/calles";

@Component({
  selector: "app-inicio",
  templateUrl: "./inicio.page.html",
  styleUrls: ["./inicio.page.scss"],
  standalone: true,
  imports: [
    IonText,
    IonIcon,
    IonImg,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonMenuButton,
    IonMenu,
    IonIcon,
    IonItem,
  ],
})
export class InicioPage implements OnInit {
  data: Calles[] = [];
  private datos = inject(CargaDatos);
  private map: Map | undefined;
  markerLayer: any;

  constructor() {
    addIcons({ notifications });
  }
  async ngOnInit() {
    await this.loadMap();
    await this.loadData();
  }

  async loadData() {
    try {
      this.data = await this.datos.getDatos();
    } catch (error) {}
  }

  // instalar paquete para el mapa
  // npm install leaflet

  async loadMap() {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      const lat = coordinates.coords.latitude;
      const lng = coordinates.coords.longitude;

      this.map = new Map({
        target: "mapId",
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
        ],
        view: new View({
          center: fromLonLat([lng, lat]),
          zoom: 15,
        }),
      });

      // Capa para los marcadores
      this.markerLayer = new VectorLayer({
        source: new VectorSource(),
      });
      this.map.addLayer(this.markerLayer);

      // Evento para capturar coordenadas y agregar marcador
      this.map.on("click", (event) => {
        this.agregarMarcador(event.coordinate);
      });
    } catch (error) {
      console.error("Error obteniendo ubicación:", error);

          this.map = new Map({
      target: "mapId",
      layers: [
        new TileLayer({
          source: new OSM(
            {
              attributions: [] 
            }
          ),
          
          
        }),
      ],
      view: new View({
            center: fromLonLat([-77.067, 3.883]),
        zoom: 15,
      }),
    });

      this.markerLayer = new VectorLayer({
        source: new VectorSource(),
      });
      this.map.addLayer(this.markerLayer);

      this.map.on("click", (event) => {
        this.agregarMarcador(event.coordinate);
      });
    }
  }


  agregarMarcador(coordinate: Coordinate) {
    // Convertir a longitud/latitud
    const lonLat = toLonLat(coordinate);

    console.log("Coordenadas:", {
      longitud: lonLat[0],
      latitud: lonLat[1],
    });

    // Limpiar marcadores anteriores (opcional)
    this.markerLayer.getSource().clear();

    // Crear nuevo marcador
    const marker = new Feature({
      geometry: new Point(coordinate),
    });

    // Estilo del marcador
    marker.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: "red" }),
          stroke: new Stroke({
            color: "white",
            width: 2,
          }),
        }),
      })
    );

    // Agregar marcador a la capa
    this.markerLayer.getSource().addFeature(marker);

    // Mostrar coordenadas
    this.mostrarCoordenadas(lonLat[0], lonLat[1]);
  }

  mostrarCoordenadas(longitud: number, latitud: number) {
    // Implementa cómo quieres mostrar las coordenadas
    alert(
      `Coordenadas capturadas:\nLongitud: ${longitud.toFixed(
        6
      )}\nLatitud: ${latitud.toFixed(6)}`
    );
  }
}
