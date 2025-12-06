import { Injectable } from '@angular/core';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { environment } from 'src/environments/environment';
import { Calles } from 'src/interfaces/calles';
import { Rutas } from 'src/interfaces/rutas';
import { Vehiculos } from 'src/interfaces/vehiculos';

export interface Posicion {
  lat: number;
  lon: number;
  perfil_id: string;
}

@Injectable({
  providedIn: 'root'
})
export class CargaDatos {
  private readonly perfilId = 'c14fb089-0812-4ba8-8a35-32ba08e35ce6';

  constructor() { }

  // Método para obtener calles
  public async getDatos(): Promise<Calles[]> {
    const options = {
      url: environment.url + '/calles',
      method: 'GET',
    };
    const response: HttpResponse = await CapacitorHttp.get(options);    
    return response.data.data as Calles[];
  }

  // Método para buscar calles por nombre
  public async buscarCallePorNombre(nombre: string): Promise<Calles[]> {
    const options = {
      url: environment.url + '/calles',
      method: 'GET',
    };
    
    const response: HttpResponse = await CapacitorHttp.get(options);    
    const todasLasCalles = response.data.data as Calles[];
    
    return todasLasCalles.filter(calle => 
      calle.nombre.toLowerCase().includes(nombre.toLowerCase())
    );
  }

  // NUEVO: Método mejorado para guardar rutas
  async guardarRuta(rutaData: Rutas): Promise<any> {
    // Determinar si estamos en desarrollo o producción
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';
    
    const baseUrl = isDev ? environment.url : environment.url;
    
    // Construir la URL correctamente
    const url = `${baseUrl}/rutas`;
    
    console.log('🌐 URL de guardado:', url);
    console.log('📦 Datos a enviar:', rutaData);

    const options = {
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: rutaData
    };

    try {
      console.log('🚀 Enviando solicitud POST...');
      const response: HttpResponse = await CapacitorHttp.post(options);
      
      console.log('✅ Respuesta del servidor:', response);
      
      if (response.status >= 200 && response.status < 300) {
        return response.data;
      } else {
        throw new Error(`Error ${response.status}: ${response.data?.message || 'Error del servidor'}`);
      }
    } catch (error: any) {
      console.error('❌ Error completo al guardar ruta:', error);
      
      // Proporcionar más detalles del error
      const errorDetails = {
        message: error.message,
        status: error.status,
        url: url,
        data: rutaData
      };
      
      throw errorDetails;
    }
  }

  // Método para obtener rutas del servidor (mejorado)
  async obtenerRutas(): Promise<Rutas[]> {
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';
    const baseUrl = isDev ? environment.url : environment.url;
    const url = `${baseUrl}/rutas?perfil_id=${this.perfilId}`;
    
    console.log('🔍 Obteniendo rutas desde:', url);

    const options = {
      url: url,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    try {
      const response: HttpResponse = await CapacitorHttp.get(options);
      console.log('📋 Rutas obtenidas:', response.data);
      
      if (response.data && response.data.data) {
        return response.data.data as Rutas[];
      } else {
        return [];
      }
    } catch (error) {
      console.error('❌ Error al obtener rutas:', error);
      throw error;
    }
  }

  // NUEVO: Método para eliminar una ruta
  async eliminarRuta(rutaId: string): Promise<any> {
    const isDev = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';
    const baseUrl = isDev ? environment.url : environment.url;
    const url = `${baseUrl}/rutas/${rutaId}`;

    const options = {
      url: url,
      method: 'DELETE',
      headers: {
        'Accept': 'application/json'
      }
    };

    try {
      const response: HttpResponse = await CapacitorHttp.delete(options);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar ruta:', error);
      throw error;
    }
  }

    async registrarVehiculo(formValue: {
    placa: string;
    marca: string;
    modelo: string;
    activo: boolean;
    perfil_id: string;
  }): Promise<Vehiculos> {
    const options = {
      url: environment.url + '/vehiculos',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      data: formValue,
    };

    try {
      const response: HttpResponse = await CapacitorHttp.post(options);
      return response.data;
    } catch (error) {
      console.error('Error al registrar vehículo:', error);
      throw error;
    }
  }
    async obtenerVehiculos(): Promise<Vehiculos[]> {
    const options = {
      url: environment.url + `/vehiculos?perfil_id=${this.perfilId}`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    };

    try {
      const response: HttpResponse = await CapacitorHttp.get(options);
      return response.data.data as Vehiculos[];
    } catch (error) {
      console.error('Error al obtener vehículos:', error);
      throw error;
    }
  }

  /**
   * Obtener vehículo por id con cache local.
   * @param vehiculoId id del vehículo a obtener
   * @param forceRefresh si es true fuerza la consulta al servidor y actualiza la cache
   */
  async obtenerVehiculoPorId(vehiculoId: string, forceRefresh = false): Promise<Vehiculos | null> {
    const cacheKey = `vehiculo_${vehiculoId}`;
    const options = {
      url: environment.url + `/vehiculos/${vehiculoId}?perfil_id=${this.perfilId}`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    };

    try {
      // intentar leer cache local
      if (!forceRefresh) {
        try {
          const { value } = await Preferences.get({ key: cacheKey });
          if (value) {
            const cached = JSON.parse(value) as Vehiculos;
            return cached;
          }
        } catch (e) {
          // si falla el parse o la lectura, seguimos y consultamos al servidor
          console.warn('No se pudo leer cache de vehículo (se consultará al servidor):', e);
        }
      }

      const response: HttpResponse = await CapacitorHttp.get(options);
      const vehiculo = response.data as Vehiculos;

      // guardar en cache (no bloquear si falla)
      try {
        await Preferences.set({ key: cacheKey, value: JSON.stringify(vehiculo) });
      } catch (e) {
        console.warn('No se pudo cachear vehículo:', e);
      }

      return vehiculo;
    } catch (error) {
      console.error('Error al obtener vehículo por ID:', error);
      return null;
    }
  }

    async iniciarRecorrido(recorridoData: {
    ruta_id: string;
    vehiculo_id: string;
    perfil_id: string; }): Promise<any> {
    const options = {
      url: environment.url + '/recorridos/iniciar',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      data: recorridoData,
    };

    try {
      const response: HttpResponse = await CapacitorHttp.post(options);
      return response.data;
    } catch (error) {
      console.error('Error al iniciar recorrido:', error);
      throw error;
    }
  }

 async finalizarRecorrido(recorridoId: string, perfilId: string): Promise<any> {
  const options = {
    url: environment.url + `/recorridos/${recorridoId}/finalizar`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    data: {
      "perfil_id": perfilId
    }
  };

  try {
    const response: HttpResponse = await CapacitorHttp.post(options);
    return response.data;
  } catch (error) {
    console.error('Error al finalizar recorrido:', error);
    throw error;
  }   
}

   async obtenerRutasIds(): Promise<Rutas[]> {
    const options = {
      url: environment.url + `/rutas?perfil_id=${this.perfilId}`,
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    };

    try {
      const response: HttpResponse = await CapacitorHttp.get(options);
      const rutas: Rutas[] = response.data.data as Rutas[];
      return rutas;
    } catch (error) {
      console.error('Error al obtener IDs de rutas:', error);
      throw error;
    }

  }

   async enviarPosicion(recorridoId: string, posicion: Posicion): Promise<any> {
    const url = `${environment.url}/recorridos/${recorridoId}/posiciones`;
    
    console.log('🚀 Enviando posición con Capacitor HTTP:', {
      url: url,
      datos: posicion
    });

    try {
      const options = {
        url: url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data: posicion
      };

      const response = await CapacitorHttp.request(options);
      
      console.log('✅ Respuesta de Capacitor HTTP:', {
        status: response.status,
        data: response.data
      });

      return response.data;

    } catch (error: any) {
      console.error('❌ Error en Capacitor HTTP:', {
        mensaje: error.message,
        error: error
      });
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Probar conexión con el servidor
   */
  async probarConexion(): Promise<boolean> {
    try {
      const response = await CapacitorHttp.request({
        url: `${environment.url}/recorridos`,
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      console.log('✅ Conexión exitosa:', response.status);
      return true;
    } catch (error) {
      console.error('❌ No hay conexión al servidor:', error);
      return false;
    }
  }

  /**
   * Enviar múltiples posiciones (batch)
   */
  async enviarPosicionesBatch(recorridoId: string, posiciones: Posicion[]): Promise<any[]> {
    const resultados = [];
    
    for (const posicion of posiciones) {
      try {
        const resultado = await this.enviarPosicion(recorridoId, posicion);
        resultados.push({ success: true, data: resultado });
      } catch (error) {
        resultados.push({ success: false, error: error });
      }
    }
    
    return resultados;
  }

  private getErrorMessage(error: any): string {
    if (error.message) {
      return error.message;
    }
    if (error.status === 0) {
      return 'No hay conexión a internet';
    }
    if (error.status === 404) {
      return 'Endpoint no encontrado. Verifica la URL.';
    }
    if (error.status >= 400 && error.status < 500) {
      return `Error del cliente (${error.status}): Verifica los datos enviados`;
    }
    if (error.status >= 500) {
      return `Error del servidor (${error.status})`;
    }
    return 'Error desconocido al comunicarse con el servidor';
  }
  
}