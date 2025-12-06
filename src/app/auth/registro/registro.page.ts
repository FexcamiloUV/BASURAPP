import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonButton, IonInput, LoadingController, NavController, IonImg, IonText, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { Alerts } from 'src/service/alerts/alerts';   
import { AuthService } from 'src/service/Auth/auth-service';

@Component({
  selector: 'app-register',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [IonSelect, IonSelectOption, IonText, IonImg, FormsModule, ReactiveFormsModule, IonButton, IonItem, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, IonInput, FormsModule]
})
export class RegistroPage implements OnInit {
  registerForm!: FormGroup;
  private Alerts = inject(Alerts);
  private loadingController = inject(LoadingController);
  private AuthService = inject(AuthService);
  private nav = inject(NavController);

  constructor() { }

  ngOnInit() {
    this.registerForm = new FormGroup({
      name: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
      role: new FormControl('', [Validators.required]) // 🔥 AGREGAR ESTA LÍNEA
    });
  }

 async register() {
  if (this.registerForm.invalid) return this.Alerts.DataVacia();

  const loading = await this.loadingController.create({
    message: 'Creando cuenta...',
  });
  await loading.present();

  try {
    const formValue = this.registerForm.value;
    const result = await this.AuthService.register({
      name: formValue.name,
      email: formValue.email,
      password: formValue.password,
      role: formValue.role
    });
    
    if (result.success) {
      this.nav.navigateRoot('/login');
      await loading.dismiss();
    } else {
      await loading.dismiss();
    }
  } catch (error) {
    console.error('Error during registration:', error);
    await loading.dismiss();
    this.Alerts.DataIncorreta();
  }
}
}