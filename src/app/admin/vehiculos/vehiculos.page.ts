import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonText, IonButton, IonList, IonIcon, IonItem, LoadingController, IonSelectOption, IonModal, IonLabel } from '@ionic/angular/standalone';
import { Vehiculos } from 'src/interfaces/vehiculos';
import { CargaDatos } from '../../../service/datos/cargar-datos';
import { Alerts } from 'src/service/alerts/alerts';

@Component({
  selector: 'app-vehiculos',
  templateUrl: './vehiculos.page.html',
  styleUrls: ['./vehiculos.page.scss'],
  standalone: true,
  imports: [IonLabel, IonModal, ReactiveFormsModule, IonItem, IonIcon, IonList, IonButton, IonText, IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonSelectOption]
})
export class VehiculosPage implements OnInit {
    vehiculo! : Vehiculos[];
    
      modalVehiculo = false;

      anos = ['2019', '2020', '2021', '2022', '2023', '2024'];

      vehiculoModal = false;
        vehiculoForm!: FormGroup;
        private loadingController = inject(LoadingController);
        private alerts = inject(Alerts);

      vehiculoData: Vehiculos | null = null;
      private CargaDatos = inject(CargaDatos);
      

  

  constructor() { }

  ngOnInit() {
  }



  cerrarModalVehiculo(){
    this.vehiculoModal = false;
  }

    abriModalVehiculo(){
    this.modalVehiculo = true;
  }
  CerrarVehiculo(){
    this.modalVehiculo = false;
  }
   vehiculoModalOpen(){
    this.vehiculoModal = true;
  }
    async verVehiculo(id: string) {
    this.vehiculoData = await this.CargaDatos.obtenerVehiculoPorId(id);
    this.vehiculoModalOpen();
  }



   async obtenerVehiculos() {
    this.vehiculo = await this.CargaDatos.obtenerVehiculos();
    console.log("Vehículos Disponibles", this.vehiculo);
  }


   async registrarVehiculo() {
    const formValue = this.vehiculoForm.value;

    if (this.vehiculoForm.invalid) {
      this.alerts.DataIncorreta();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Registrando Vehículo...',
    });

    await loading.present();
    
    try {
      await this.CargaDatos.registrarVehiculo(formValue);
      await loading.dismiss();
      this.vehiculoForm.reset();
      console.log('Vehículo registrado con éxito', formValue);
    } catch (error) {
      await loading.dismiss();
      console.error('Error registrando vehículo:', error);
    }
  }

}
