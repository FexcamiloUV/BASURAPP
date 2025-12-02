import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

export interface Ruta {
  id?: string;
  nombre: string;
  descripcion?: string;
  geo_json: any;
  creado_en?: string;
  activa?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey 
    );
  }

  async guardarRuta(ruta: Ruta): Promise<{ data: any; error: any }> {
    return await this.supabase
      .from('rutas')
      .insert([ruta])
      .select();
  }

  async obtenerRutas(): Promise<{ data: Ruta[] | null; error: any }> {
    return await this.supabase
      .from('rutas')
      .select('*')
      .order('creado_en', { ascending: false });
  }

  async eliminarRuta(id: string): Promise<{ error: any }> {
    return await this.supabase
      .from('rutas')
      .delete()
      .eq('id', id);
  }

  async actualizarRuta(id: string, ruta: Partial<Ruta>): Promise<{ data: any; error: any }> {
    return await this.supabase
      .from('rutas')
      .update(ruta)
      .eq('id', id)
      .select();
  }
  // Un solo método para obtener rutas activas
  async obtenerRutasActivas(): Promise<{ data: Ruta[] | null; error: any }> {
    try {
      const { data, error } = await this.supabase
        .from('rutas')
        .select('*')
        .eq('activa', true)
        .order('creado_en', { ascending: false });

      return { data: data as Ruta[], error };
    } catch (error) {
      return { data: null, error };
    }
  }
}