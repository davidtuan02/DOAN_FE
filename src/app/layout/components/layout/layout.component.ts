import { Component } from '@angular/core';
import { SidebarComponent, TopbarComponent } from '../../../layout/components';
import { RouterOutlet } from '@angular/router';
import { SvgDefinitionsComponent } from '../../../shared/components';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, SvgDefinitionsComponent, FooterComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {}
