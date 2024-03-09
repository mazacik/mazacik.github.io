import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TippyModule } from '@ngneat/helipopper';
import { DialogBaseComponent } from './components/dialog/dialog-base.component';
import { SwitchComponent } from './components/switch/switch.component';
import { ConfirmationDialogComponent } from './dialogs/confirmation/confirmation-dialog.component';
import { MessageDialogComponent } from './dialogs/message/message-dialog.component';
import { DragdropDirective } from './directives/dragdrop.directive';
import { OnCreateDirective } from './directives/on-create.directive';
import { VariableDirective } from './directives/variable.directive';
import { GoogleDriveInterceptor } from './interceptors/google-drive.interceptor';

@NgModule({
  declarations: [
    OnCreateDirective,
    DragdropDirective,
    VariableDirective,
    DialogBaseComponent,
    MessageDialogComponent,
    ConfirmationDialogComponent,
    SwitchComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    TippyModule.forRoot({
      defaultVariation: 'tooltip',
      variations: {
        tooltip: {
          arrow: true,
          animation: 'fade',
          trigger: 'mouseenter',
          hideOnClick: false,
          offset: [0, 6]
        }
      }
    })
  ],
  exports: [
    FormsModule,
    TippyModule,
    OnCreateDirective,
    DragdropDirective,
    VariableDirective,
    DialogBaseComponent,
    MessageDialogComponent,
    ConfirmationDialogComponent,
    SwitchComponent
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: GoogleDriveInterceptor, multi: true }
  ]
})
export class SharedModule { }
