import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeConductorPage } from './home-admin.page';
import { beforeEach, describe, it } from 'node:test';

describe('HomeConductorPage', () => {
  let component: HomeConductorPage;
  let fixture: ComponentFixture<HomeConductorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeConductorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
function expect(component: HomeConductorPage) {
  throw new Error('Function not implemented.');
}

