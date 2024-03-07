import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [],
  templateUrl: './error.component.html',
  styleUrl: './error.component.scss'
})
export class ErrorComponent {
  message: string = "";

    constructor(private route: ActivatedRoute) {
		this.message = this.route.snapshot.queryParams['reason'] || 'Sorry there was a problem.';
    }
}
