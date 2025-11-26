import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro.page').then( m => m.RegistroPage)
  },
  {
    path: 'home-conductor',
    loadComponent: () => import('./conductor/home-conductor/home-conductor.page').then( m => m.HomeConductorPage)
  },
  {
    path: 'home-admin',
    loadComponent: () => import('./admin/home-admin/home-admin.page').then( m => m.HomeAdminPage)
  },
]
