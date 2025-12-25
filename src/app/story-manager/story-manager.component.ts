import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { StoryManagerStateService } from './services/story-manager-state.service';

@Component({
  selector: 'app-story-manager',
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent
  ],
  templateUrl: './story-manager.component.html',
  styleUrls: ['./story-manager.component.scss']
})
export class StoryManagerComponent {

  constructor(
    protected stateService: StoryManagerStateService
  ) { }

}
