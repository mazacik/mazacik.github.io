import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationService } from '../shared/services/application.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {

  constructor(
    private router: Router,
    protected applicationService: ApplicationService
  ) {
    this.applicationService.loading.set(false);
  }

  ngOnInit(): void {

  }

  navigate(value: string): void {
    sessionStorage.setItem('appId', value);
    this.applicationService.loading.set(true);
    this.router.navigate([value]);
  }

}
