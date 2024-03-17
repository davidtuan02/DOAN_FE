import { Routes } from "@angular/router";
import { ErrorComponent } from "./shared/components";
import { LoginComponent } from "./features/components";
import { LayoutComponent } from "./layout/components";

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
    component: LayoutComponent,
    loadChildren: () => import('./features/components/project/project-routing.module').then(m => m.ProjectRoutingModule)
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