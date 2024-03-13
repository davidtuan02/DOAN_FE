import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../../core/models';
import { CommonModule } from '@angular/common';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule, NzToolTipModule],
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss']
})
export class AvatarComponent {
  @Input() user!: User | null;
  @Input() size: number = 32;
  @Input() bordered: boolean = false;
  @Input() selected: boolean | undefined = false;

  @Output() select = new EventEmitter();

  onSelect(): void {
    this.select.emit(this.user?.id);
  }
}
