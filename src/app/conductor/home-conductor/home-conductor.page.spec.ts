import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeConductorPage } from './home-conductor.page';

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
