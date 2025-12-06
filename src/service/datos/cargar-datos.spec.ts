import { TestBed } from '@angular/core/testing';

import { CargarDatos } from './cargar-datos';

describe('CargarDatos', () => {
  let service: CargarDatos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CargarDatos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
