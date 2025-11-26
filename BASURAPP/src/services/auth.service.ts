import { Injectable } from '@angular/core';
import { UserProfile } from 'src/interfaces/userprofile';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';
import { Preferences } from '@capacitor/preferences';
@Injectable({
  providedIn: 'root'
})

export class AuthService {
    private supabase: SupabaseClient;
  public currentUser: UserProfile | null = null;
    constructor() {
      this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    }
    private async saveSession(user: UserProfile): Promise<void> {
    await this.setStorage('isLoggedIn', 'true');
    await this.setStorage('userEmail', user.email);
    await this.setStorage('userId', user.id);
    await this.setStorage('userRole', user.role);
    await this.setStorage('userName', user.name);
  }
  private async setStorage(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }
   async login(formValue: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    try {
      console.log('Intentando login con:', formValue.email);

      const { data: user, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('email', formValue.email)
        .eq('password', formValue.password)
        .eq('is_active', true)
        .single();

      if (error) {
        return { success: false, error: 'Credenciales incorrectas' };
      }

      if (!user) {
        return { success: false, error: 'Usuario no encontrado' };
      }

      console.log('Login exitoso:', user);

      // Actualizar last_login
      await this.supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Guardar sesión
      await this.saveSession(user);
      this.currentUser = user;

      return { 
        success: true, 
        user: user 
      };
    } catch (error) {
      console.error('Error en login:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }
  async register(formValue: { 
    name: string; 
    email: string; 
    password: string;
    role?: 'conductor' | 'admin';
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Verificar si el email ya existe
      const { data: existingUser, error: checkError } = await this.supabase
        .from('profiles')
        .select('email')
        .eq('email', formValue.email)
        .single();

      if (existingUser) {
        return { success: false, error: 'El email ya está registrado' };
      }

      const { data: newUser, error } = await this.supabase
        .from('profiles')
        .insert([{
          email: formValue.email,
          name: formValue.name,
          password: formValue.password,
          role: formValue.role || 'conductor',
          is_active: true,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      if (newUser) {
        console.log('Usuario registrado directamente en profiles:', newUser);
        return { success: true };
      }
      
      return { success: false, error: 'Error al crear usuario' };
    } catch (error) {
      console.error('Error en register:', error);
      return { success: false, error: 'Error de conexión' };
    }
  }
  async isAuthenticated(): Promise<boolean> {
    const userId = await this.getStorage('userId');
    return !!userId;
  }
  private async getStorage(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }
  async hasAnyRole(requiredRoles: string[]): Promise<boolean> {
    const user = await this.getUserProfile();
    return user ? requiredRoles.includes(user.role) : false;
  }
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      if (this.currentUser) {
        return this.currentUser;
      }

      const userId = await this.getStorage('userId');
      if (!userId) {
        return null;
      }

      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error obteniendo profile:', error);
        return null;
      }

      this.currentUser = profile;
      return profile;
    } catch (error) {
      console.error('Error en getUserProfile:', error);
      return null;
    }
  }
}

