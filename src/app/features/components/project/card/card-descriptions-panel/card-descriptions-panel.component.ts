import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Store } from '@ngrx/store';
import { Card, PartialCard } from '../../../../../core/models';
import { takeUntil } from 'rxjs/operators';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AttachmentService } from '../../../../../services/attachment.service';
import { CommonModule } from '@angular/common';
import { CardTitleComponent } from '../card-title/card-title.component';
import { CardDescriptionComponent } from '../card-description/card-description.component';
import { SvgIconComponent } from '../../../../../shared/components';
import { CardAttachmentComponent } from '../card-attachment/card-attachment.component';
import { CardEnvironmentComponent } from '../card-environment/card-environment.component';
import { CardActivityComponent } from '../card-activity/card-activity.component';
import * as fromStore from '../../../../../core/store';

@Component({
  selector: 'app-card-descriptions-panel',
  standalone: true,
  imports: [
    CommonModule,
    CardTitleComponent,
    CardDescriptionComponent,
    SvgIconComponent,
    CardAttachmentComponent,
    CardEnvironmentComponent,
    CardActivityComponent,
  ],
  templateUrl: './card-descriptions-panel.component.html',
  styleUrls: ['./card-descriptions-panel.component.scss'],
})
export class CardDescriptionsPanelComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedCard$: Observable<Card | null | undefined>;
  private unsubscribe$ = new Subject<void>();
  private cardId: string | null = null;

  constructor(
    private store: Store<fromStore.AppState>,
    private message: NzMessageService,
    private attachmentService: AttachmentService
  ) {
    this.selectedCard$ = this.store.select(fromStore.selectSelectedCard);
  }

  ngOnInit(): void {
    this.selectedCard$.pipe(takeUntil(this.unsubscribe$)).subscribe((card) => {
      if (card) {
        this.cardId = card.id;
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  onUpdateCard(partial: PartialCard): void {
    this.store.dispatch(fromStore.updateCard({ partial }));
  }

  openAttachmentUpload(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  handleFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;

    if (fileInput.files && fileInput.files.length > 0 && this.cardId) {
      const file = fileInput.files[0];
      this.uploadFile(file);

      // Reset the file input
      fileInput.value = '';
    }
  }

  private uploadFile(file: File): void {
    if (!this.cardId) {
      this.message.error('Cannot upload file: No card selected');
      return;
    }

    const loadingMessage = this.message.loading(`Uploading ${file.name}...`, {
      nzDuration: 0,
    }).messageId;

    this.attachmentService.uploadAttachment(file, this.cardId).subscribe({
      next: () => {
        this.message.remove(loadingMessage);
        this.message.success(`${file.name} uploaded successfully`);
      },
      error: (error) => {
        console.error('Error uploading file:', error);
        this.message.remove(loadingMessage);
        this.message.error(`Failed to upload ${file.name}`);
      },
    });
  }
}
