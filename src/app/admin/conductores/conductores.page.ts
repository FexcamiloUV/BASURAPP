import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonModal, IonItem, IonText, IonLabel, LoadingController, IonButton, IonList, IonIcon } from '@ionic/angular/standalone';
import { UserProfile } from 'src/interfaces/userprofile';
import { AuthService } from 'src/service/Auth/auth-service';
import { Alerts } from 'src/service/alerts/alerts';

@Component({
  selector: 'app-conductores',
  templateUrl: './conductores.page.html',
  styleUrls: ['./conductores.page.scss'],
  standalone: true,
  imports: [IonIcon, IonList, IonButton, ReactiveFormsModule, IonLabel, IonText, IonItem, IonModal, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class ConductoresPage implements OnInit {
    modalAbiertoInfo = false;
      Perfil: UserProfile | null = null;
        modalConductores = false;
          registerForm!: FormGroup;
          private loadingController = inject(LoadingController);
          private authService = inject(AuthService);
          private Alerts = inject(Alerts);
            conductores: UserProfile[] = [];



    


  constructor() { }

  async ngOnInit() {
      this.registerForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    role: new FormControl('conductor', [Validators.required])
  });

    await this.getConductores();

  }
  async getConductores() {
    this.conductores = await this.authService.getAllConductores();
  }
    abriModalConductor(){
    this.modalConductores = true;
  }
  cerraModalConductor(){
    this.modalConductores = false;
  }
    abrirModalInfo() {
    this.modalAbiertoInfo = true;
  }

   cerrarModalInfo() {
    this.modalAbiertoInfo = false;
  }

   async verConductor(id: string) {
    this.Perfil = await this.authService.getProfileById(id);
    this.abrirModalInfo();
  }
  

   async register() {
  if (this.registerForm.invalid) return this.Alerts.DataVacia();

  const loading = await this.loadingController.create({
    message: 'Creando cuenta...',
  });
  await loading.present();

  try {
    const formValue = this.registerForm.value;
    const result = await this.authService.register({
      name: formValue.name,
      email: formValue.email,
      password: formValue.password,
      role: formValue.role
    });
    
    if (result.success) {
      await loading.dismiss();
      this.registerForm.reset();
      await this.getConductores();
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
