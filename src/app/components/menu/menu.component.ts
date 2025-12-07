import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonMenu, IonHeader, IonIcon, IonToolbar, IonContent, IonRouterOutlet, IonItem, IonTitle, IonLabel, IonList, IonMenuToggle, NavController, AlertController } from "@ionic/angular/standalone";
import { AuthService } from 'src/service/Auth/auth-service';
import Map from "ol/Map";


@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  standalone: true,
  imports: [IonList, IonLabel, IonTitle, IonItem, IonRouterOutlet, IonContent, IonToolbar, IonIcon, IonHeader, IonApp, IonMenu, IonMenuToggle],
})
export class MenuComponent  implements OnInit {
    private authService = inject(AuthService)
    private nav = inject(NavController)
    private alertController = inject(AlertController);
      isLoading: boolean | undefined;
        markerLayer: any;
  routeLayer: any;
  rutasLayer: any;
      private map: Map | undefined;


  

  constructor() { }

  ngOnInit() {}



   async logout() {
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

}
