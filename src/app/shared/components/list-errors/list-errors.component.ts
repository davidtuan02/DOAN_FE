import { Component, Input } from "@angular/core";
import { Errors } from "../../../core/models/base/errors";
import { NgForOf, NgIf } from "@angular/common";

@Component({
  selector: 'app-list-errors',
  standalone: true,
  imports: [NgIf, NgForOf],
  templateUrl: './list-errors.component.html',
  styleUrl: './list-errors.component.scss'
})
export class ListErrorsComponent {
  errorList: string[] = [];

  @Input() set errors(errorList: Errors | null) {
    this.errorList = errorList
      ? Object.keys(errorList.errors || {}).map(
          (key) => `${key} ${errorList.errors[key]}`,
        )
      : [];
  }
}
