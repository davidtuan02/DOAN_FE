import { Component } from '@angular/core';
import { faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { InputComponent } from '../../../../shared/components';
import { extractError } from '../../../../shared/utils';
import { NzPopoverModule } from 'ng-zorro-antd/popover';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [InputComponent, ReactiveFormsModule, RouterModule, NzPopoverModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  faEnvelope = faEnvelope;
  faLock = faLock;

  form: FormGroup;

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  submitForm(): void {
    this.router.navigate(['/board']);
    // this.store
    //   .dispatch(
    //     new AuthLogin({
    //       email: this.getControl('email').value,
    //       password: this.getControl('password').value,
    //     }),
    //   )
    //   .subscribe(
    //     _ => {
    //       const { returnUrl } = this.route.snapshot.params;
    //       this.store.dispatch(new Navigate([returnUrl || '/']));
    //     },
    //     (err: HttpErrorResponse) => this.store.dispatch(new ToasterError(extractError(err))),
    //   );
  }

  private getControl(path: string): FormControl {
    return this.form.get(path) as FormControl;
  }
}
