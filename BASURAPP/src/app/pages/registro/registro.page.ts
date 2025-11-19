import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonLabel, IonItem, IonButton, IonRouterLink, IonInput, IonIcon, NavController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
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

  formularioRegistro: FormGroup;

  constructor(public fb: FormBuilder) {
    this.formularioRegistro = this.fb.group({
      email: new FormControl("", Validators.required),
      password: new FormControl("", Validators.required),
      confirmarPassword: new FormControl("", Validators.required)
    });
    addIcons({arrowBackOutline});
  }

  ngOnInit() {}
  back() {
    this.nav.back();
  }
}
