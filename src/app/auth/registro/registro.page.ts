import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonLabel, IonItem, IonButton, IonRouterLink, IonInput, IonIcon, NavController, LoadingController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from 'src/service/Auth/auth-service';
@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonLabel,
    IonItem,
    IonButton,
    IonRouterLink,
    IonInput,
    IonIcon
]
})
export class RegistroPage implements OnInit {
private nav = inject(NavController)

  formularioRegistro!: FormGroup;
  private loadingController = inject(LoadingController);
private authService = inject(AuthService)

  constructor(){
     addIcons({arrowBackOutline});
  };
  

  ngOnInit() {
    this.formularioRegistro = new FormGroup({
      name: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
      role: new FormControl('conductor', Validators.required)
    });
  }
  async register() {
    if (this.formularioRegistro.invalid) return console.log('Formulario inválido');

    const loading = await this.loadingController.create({
      message: 'Registrando conductor...',
    });

    await loading.present();

    try {
      const formValue = this.formularioRegistro.value;
      const result = await this.authService.register({
        name: formValue.name,
        email: formValue.email,
        password: formValue.password,
        role: formValue.role,
      });

      if (result.success) {
        await loading.dismiss();
        this.formularioRegistro.reset();
      } else {
        await loading.dismiss();
      }
    } catch (error) {
      console.error('Error during registration:', error);
      await loading.dismiss();
      console.log('Error de conexión');
    }
  }
  back() {
    this.nav.back();
  }
}
