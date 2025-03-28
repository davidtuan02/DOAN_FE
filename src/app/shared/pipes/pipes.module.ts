import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { OrderByPipe } from './order-by.pipe';
import { DateFormatPipe } from './date-format.pipe';

const PIPES = [OrderByPipe, DateFormatPipe];

@NgModule({
  imports: [
    CommonModule,
    ...PIPES, // Import standalone pipes
  ],
  exports: [
    ...PIPES, // Export standalone pipes
  ],
  providers: [DatePipe],
})
export class PipesModule {}
