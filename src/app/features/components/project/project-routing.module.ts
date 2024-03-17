import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BoardContainerComponent } from './board/board-container/board-container.component';

const routes: Routes = [
  {
    path: '',
    component: BoardContainerComponent,
    //resolve: [_resolvers.DashboardResolver],
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  //providers: [_resolvers.DashboardResolver],
})
export class ProjectRoutingModule {}
