import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormControl, Validators, FormBuilder, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonImg, IonRow, IonCol, IonItem, IonLabel, IonButton, IonInput, IonRouterLink, NavController, LoadingController } from '@ionic/angular/standalone';
import { AuthService } from 'src/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonImg,
    IonRow,
    IonCol,
    IonItem,
    IonLabel,
    IonButton,
    IonInput,
    ReactiveFormsModule,
    IonRouterLink
]
})
export class LoginPage implements OnInit {
private nav = inject(NavController)
  formularioLogin!: FormGroup;
private loadingController = inject(LoadingController);
private authService = inject(AuthService)
  constructor() { 
  }

  ngOnInit() {
    this.formularioLogin = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)])
    });
  }
async login(){
    if (this.formularioLogin.invalid) return console.log('Formulario inválido');

  const loading = await this.loadingController.create({
    message: 'Iniciando sesión...',
  });
  await loading.present();

  try {
    const formValue = this.formularioLogin.value;
    const result = await this.authService.login({
      email: formValue.email,
      password: formValue.password
    });
    
    if (result.success && result.user) {
      console.log('Login exitoso, rol:', result.user.role);
      
      //NAVEGAR SEGÚN EL ROL DEL USER
      if (result.user.role === 'admin') {
        this.nav.navigateRoot('/home-admin');
      } else if (result.user.role === 'conductor') {
        this.nav.navigateRoot('/home-conductor');
      } else {
        this.nav.navigateRoot('/login');
      }
      
      await loading.dismiss();
    } else {
      await loading.dismiss();
    }
  } catch (error) {
    console.error('Error during login:', error);
    await loading.dismiss();
  }
 }
 register() {
  this.nav.navigateForward('/registro');
}
}

