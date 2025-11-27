import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Calles } from 'src/interfaces/calles';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';
@Injectable({
  providedIn: 'root',
})
export class Datos {
  constructor() {}
  public async getDatos(): Promise<Calles[]> {
    const options = { method: 'GET', url: environment.url + '/calles' };
    const response: HttpResponse = await CapacitorHttp.get(options);
    return response.data.data as Calles[];
  }
}
