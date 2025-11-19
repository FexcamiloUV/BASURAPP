import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormControl, Validators, FormBuilder, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonImg, IonRow, IonCol, IonItem, IonLabel, IonButton, IonInput, IonRouterLink, NavController } from '@ionic/angular/standalone';

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
  formularioLogin: FormGroup;

  constructor(public fb: FormBuilder) { 
    this.formularioLogin = this.fb.group({
      email: new FormControl("", Validators.required),
      password: new FormControl("", Validators.required)
    });
  }

  ngOnInit() {}

register() {
  this.nav.navigateForward('/registro');
}
}
