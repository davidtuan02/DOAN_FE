import { Component } from '@angular/core';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { SvgIconComponent } from '../../../../../shared/components';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-board-heading',
  standalone: true,
  imports: [CommonModule, NzBreadCrumbModule, NzPopoverModule, SvgIconComponent],
  templateUrl: './board-heading.component.html',
  styleUrls: ['./board-heading.component.scss']
})
export class BoardHeadingComponent {

  contextMenuVisible: boolean = false;

  onContextMenuClick(): void {
    this.contextMenuVisible = false;
  }
}
