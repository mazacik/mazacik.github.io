import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { TournamentComponent } from './tournament.component';

@NgModule({
  declarations: [
    TournamentComponent
  ],
  imports: [
    CommonModule,
    SharedModule
  ],
  exports: [

  ],
  providers: [

  ]
})
export class TournamentModule { }
