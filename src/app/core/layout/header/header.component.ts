import { Component, inject } from "@angular/core";
import { UserService } from "../../services/user.service";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { AsyncPipe, NgIf } from "@angular/common";
import { IfAuthenticatedDirective } from "../../../shared/directives/if-authenticated.directive";

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLinkActive,
    RouterLink,
    AsyncPipe,
    NgIf,
    IfAuthenticatedDirective,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  currentUser$ = inject(UserService).currentUser;
}
