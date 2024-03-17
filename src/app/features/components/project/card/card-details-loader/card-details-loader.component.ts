import { Component } from '@angular/core';
import { ContentLoaderModule } from '@ngneat/content-loader';

@Component({
  selector: 'app-card-details-loader',
  standalone: true,
  imports: [ContentLoaderModule],
  templateUrl: './card-details-loader.component.html',
})
export class CardDetailsLoaderComponent {}
