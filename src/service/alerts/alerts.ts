import { inject, Injectable } from '@angular/core';
import { AlertController , LoadingController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root'
})
export class Alerts {
  private alertController = inject(AlertController);
  private loadingController = inject(LoadingController);
  Error: any;
    async DataVacia() {
    const alert = await this.alertController.create({
      header: 'Invalido',
      subHeader: 'Datos incompletos',
      message: 'No se permiten campos vacios',
      buttons: ['OK'],
    });

    await alert.present();
  }

  async DataIncorreta() {
    const alert = await this.alertController.create({
      header: 'Invalido',
      subHeader: 'Datos incorrectos',
      message: 'Por favor verifique sus credenciales',
      buttons: ['OK'],
    });

    await alert.present();
  }

   async Loading() {
    const loading = await this.loadingController.create({
      message: 'Cargando...',
      duration: 2000,
      spinner: 'bubbles',
    });
    await loading.present();
    await loading.onDidDismiss();
  }

}
