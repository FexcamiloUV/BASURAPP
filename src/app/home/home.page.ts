import { Component, inject } from '@angular/core';
import { AuthService } from 'src/service/Auth/auth-service';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonImg,
  IonTabButton,
  IonButton,
  IonSkeletonText,
  IonText,
  IonFooter,
  NavController, IonIcon } from '@ionic/angular/standalone';
import { Alerts } from '../../service/alerts/alerts';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonIcon, 
    IonFooter,
    IonText,
    IonSkeletonText,
    IonButton,
    IonTabButton,
    IonImg,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
  ],
})
export class HomePage {
  private nav = inject(NavController);
  private Alerts = inject(Alerts);
  private authService = inject(AuthService)

  constructor() {
    addIcons({
      
    });
  }

  login() {
    this.Alerts.Loading();
    this.nav.navigateForward('/login');
  }
  registro() {
    this.Alerts.Loading();
    this.nav.navigateForward('/registro');
  }

  goCiudadano(){
        this.Alerts.Loading();
        this.nav.navigateForward('/inicio')

  }

  // En home.page.ts o donde necesites verificar
async checkAccess() {
  const isLoggedIn = await this.authService.isAuthenticated();
  
  if (isLoggedIn) {
    const isAdmin = await this.authService.isAdmin();
    const isConductor = await this.authService.isConductor();
    
    if (isAdmin) {
      this.nav.navigateBack('/admin');
    } else if (isConductor) {
      this.nav.navigateBack('/home-conductor');

    }
  } else {
    // Usuario normal - ir a inicio público
      this.nav.navigateBack('/inicio');
  }
}
}
