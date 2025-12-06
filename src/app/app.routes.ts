import { Routes } from '@angular/router';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'registro',
    loadComponent: () => import('./auth/registro/registro.page').then(m => m.RegistroPage)
  },
  {
    path: 'inicio',
    loadComponent: () => import('./pages/inicio/inicio.page').then(m => m.InicioPage)
    // SIN protección - acceso público para usuarios normales
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil.page').then(m => m.PerfilPage)
    // SIN protección - acceso público
  },
  {
    path: 'home-conductor',
    loadComponent: () => import('./conductor/home-conductor/home-conductor.page').then(m => m.HomeConductorPage),
    canActivate: [RoleGuard],
    data: { roles: ['conductor', 'admin'] } // Solo conductores y admin
  },
  // Ruta para admin (si la necesitas)
  {
    path: 'admin',
    loadComponent: () => import('./admin/home-admin/home-admin.page').then(m => m.HomeAdminPage),
    canActivate: [RoleGuard],
    data: { roles: ['admin'] } // Solo admin
  },
];