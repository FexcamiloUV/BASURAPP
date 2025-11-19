import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonItem} from '@ionic/angular/standalone';
import { Calles } from 'src/interfaces/calles';
import { Datos } from 'src/services/datos';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, CommonModule, IonItem],
})
export class HomePage implements OnInit {
  data: Calles[] = [];
  datos = inject(Datos)
  constructor() {}
  

  ngOnInit(): void {
    this.LlamarDatos();
  }

  async LlamarDatos() {
    this.data = await this.datos.getDatos();
  }
}
