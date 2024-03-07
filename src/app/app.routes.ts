import { Routes } from "@angular/router";
import { AuthComponent } from "./core/auth/auth.component";
import { ErrorComponent } from "./shared/components/error/error.component";
import { HomeComponent } from "./shared/components/home/home.component";
import { inject } from "@angular/core";
import { UserService } from "./core/services/user.service";
import { map } from "rxjs";

export const routes: Routes = [
  {
    path: "",
    component: HomeComponent,
    pathMatch:'full'
  },
  {
    path: "login",
    component: AuthComponent,
    canActivate: [
      () => inject(UserService).isAuthenticated.pipe(map((isAuth) => !isAuth)),
    ],
  },
  {
    path: "register",
    component: AuthComponent,
    canActivate: [
      () => inject(UserService).isAuthenticated.pipe(map((isAuth) => !isAuth)),
    ],
  },
  { 
    path: 'error', 
    component: ErrorComponent 
  },
  { 
    path: '**', 
    redirectTo:'/error?reason=NavError' 
  }
];