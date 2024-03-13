import { Routes } from "@angular/router";
import { ErrorComponent } from "./shared/components";
import { LoginComponent } from "./features/components";
import { LayoutComponent } from "./layout/components";
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
    path: "board",
    component: LayoutComponent
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