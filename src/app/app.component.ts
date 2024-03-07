import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { FooterComponent } from './core/layout/footer/footer.component';
import { HeaderComponent } from "./core/layout/header/header.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'jira-app';
}
