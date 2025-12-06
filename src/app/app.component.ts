import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonMenuToggle, IonItem, IonIcon, IonLabel, AlertController, NavController } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { home, person, logOut } from 'ionicons/icons';
import Map from "ol/Map";
import { AuthService } from 'src/service/Auth/auth-service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [
    IonApp, 
    IonRouterOutlet, 
    IonMenu, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent, 
    IonList, 
    IonMenuToggle, 
    IonItem, 
    IonIcon, 
    IonLabel,
    RouterLink
  ],
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService)
    private map: Map | undefined;
    private nav = inject(NavController)
    private alertController = inject(AlertController);
  
    userName = "";
  isLoading: boolean | undefined;
  markerLayer: any;
  routeLayer: any;
  rutasLayer: any;

  constructor() {
    addIcons({ home, person, logOut });
  }
  async ngOnInit(){
    await this.loadUserData()
  }

   async logout() {
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

  async mostrarAlerta(titulo: string, mensaje: string) {
    const alert = await this.alertController.create({
      header: titulo,
      message: mensaje,
      buttons: ["OK"],
    });

    await alert.present();
  }



  async loadUserData() {
    this.userName = await this.authService.getUserName();
  }
}
