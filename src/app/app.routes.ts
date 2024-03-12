import { Routes } from "@angular/router";
import { ErrorComponent } from "./shared/components/error/error.component";
import { LoginComponent } from "./features/landing/auth/components/login/login.component";
import { inject } from "@angular/core";
import { UserService } from "./core/services/user.service";
import { map } from "rxjs";

export const routes: Routes = [
  {
    path: "",
    redirectTo: 'login',
    pathMatch:'full'
  },
  {
    path: "login",
    component: LoginComponent
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