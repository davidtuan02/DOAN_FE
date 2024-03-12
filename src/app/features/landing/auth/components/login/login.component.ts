import { Component } from '@angular/core';
import { faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Store } from '@ngxs/store';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Navigate } from '@ngxs/router-plugin';
import { TranslateModule } from '@ngx-translate/core';
import { InputComponent } from '../../../../../shared/components/input/input.component';
import { AuthLogin, ToasterError } from '../../../../../core/store/actions';
import { Util } from '../../../../../shared/utils/util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [TranslateModule, InputComponent, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  faEnvelope = faEnvelope;
  faLock = faLock;

  form: FormGroup;

  constructor(private fb: FormBuilder, private store: Store, private route: ActivatedRoute) {
    this.form = this.fb.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  submitForm(): void {
    this.store
      .dispatch(
        new AuthLogin({
          email: this.getControl('email').value,
          password: this.getControl('password').value,
        }),
      )
      .subscribe(
        _ => {
          const { returnUrl } = this.route.snapshot.params;
          this.store.dispatch(new Navigate([returnUrl || '/']));
        },
        (err: HttpErrorResponse) => this.store.dispatch(new ToasterError(Util.extractError(err))),
      );
  }

  private getControl(path: string): FormControl {
    return this.form.get(path) as FormControl;
  }
}
