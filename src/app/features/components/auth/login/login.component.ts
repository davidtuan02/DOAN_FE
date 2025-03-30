import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../core/services';
import {
  NzNotificationModule,
  NzNotificationService,
} from 'ng-zorro-antd/notification';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { ForgotPasswordModalComponent } from '../forgot-password-modal/forgot-password-modal.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzNotificationModule,
    NzModalModule,
    ForgotPasswordModalComponent,
  ],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup = this.initializeForm();
  forgotPasswordForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });
  isLoading = false;
  showPassword = false;
  errorMessage = '';
  passwordStrength = 0;
  passwordStrengthClass = '';
  isSignUp = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService,
    private notification: NzNotificationService,
    private modal: NzModalService
  ) {}

  private initializeForm(): FormGroup {
    const baseControls = {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false],
    };

    const signUpControls = {
      ...baseControls,
      name: ['', Validators.required],
      username: ['', Validators.required],
      age: ['', [Validators.required, Validators.min(1), Validators.max(120)]],
      role: ['BASIC', Validators.required],
      confirmPassword: ['', Validators.required],
    };

    const form = this.fb.group(this.isSignUp ? signUpControls : baseControls, {
      validators: this.isSignUp ? this.passwordMatchValidator : null,
    });

    form.get('password')?.valueChanges.subscribe((password) => {
      this.calculatePasswordStrength(password);
    });

    return form;
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null
      : { passwordMismatch: true };
  }

  switchMode(mode: 'signin' | 'signup') {
    this.isSignUp = mode === 'signup';
    this.loginForm = this.initializeForm();
    this.errorMessage = '';
  }

  ngOnInit(): void {}

  calculatePasswordStrength(password: string) {
    let strength = 0;
    if (password.length >= 8) strength += 20;
    if (password.match(/[A-Z]/)) strength += 20;
    if (password.match(/[a-z]/)) strength += 20;
    if (password.match(/[0-9]/)) strength += 20;
    if (password.match(/[^A-Za-z0-9]/)) strength += 20;

    this.passwordStrength = strength;

    if (strength <= 20) this.passwordStrengthClass = 'bg-red-500';
    else if (strength <= 40) this.passwordStrengthClass = 'bg-orange-500';
    else if (strength <= 60) this.passwordStrengthClass = 'bg-yellow-500';
    else if (strength <= 80) this.passwordStrengthClass = 'bg-blue-500';
    else this.passwordStrengthClass = 'bg-green-500';
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    if (this.isSignUp) {
      const body = {
        firstName: this.loginForm.value.name,
        lastName: this.loginForm.value.name,
        age: this.loginForm.value.age,
        email: this.loginForm.value.email,
        username: this.loginForm.value.username,
        password: this.loginForm.value.password,
        role: this.loginForm.value.role,
      };

      this.userService.register(body).subscribe({
        next: (user) => {
          this.notification.success(
            'Success',
            'Account created successfully! Please login.',
            { nzDuration: 3000 }
          );
          this.isSignUp = false;
          this.loginForm = this.initializeForm();
        },
        error: (err) => {
          console.error('Registration error:', err);
          this.errorMessage =
            err.error?.message || 'Failed to create account. Please try again.';
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        },
      });
    } else {
      this.userService
        .login({
          username: this.loginForm.value.email,
          password: this.loginForm.value.password,
        })
        .subscribe({
          next: (response) => {
            this.notification.success(
              'Success',
              'You have successfully logged in!',
              { nzDuration: 3000 }
            );
            this.router.navigate(['/board']);
          },
          error: (err) => {
            console.error('Login error:', err);
            this.errorMessage =
              err.error?.message || 'Login failed. Invalid credentials.';
            this.isLoading = false;
          },
          complete: () => {
            this.isLoading = false;
          },
        });
    }
  }

  async signInWithGoogle() {
    console.log('Google sign-in clicked');
  }

  async signInWithMicrosoft() {
    console.log('Microsoft sign-in clicked');
  }

  showForgotPasswordModal(): void {
    const modalRef = this.modal.create({
      nzTitle: 'Forgot Password',
      nzContent: ForgotPasswordModalComponent,
      nzOkText: 'Send Reset Link',
      nzCancelText: 'Cancel',
      nzOnOk: (componentInstance) => {
        if (componentInstance.forgotPasswordForm.valid) {
          this.isLoading = true;
          this.userService
            .forgotPassword(componentInstance.forgotPasswordForm.value.email)
            .subscribe({
              next: (response) => {
                this.notification.success(
                  'Success',
                  'Password reset instructions have been sent to your email.',
                  { nzDuration: 5000 }
                );
                this.modal.closeAll();
              },
              error: (err) => {
                console.error('Forgot password error:', err);
                this.notification.error(
                  'Error',
                  err.error?.message ||
                    'Failed to send reset instructions. Please try again.',
                  { nzDuration: 5000 }
                );
              },
              complete: () => {
                this.isLoading = false;
              },
            });
        }
        return componentInstance.forgotPasswordForm.valid;
      },
      nzOkLoading: this.isLoading,
    });
  }
}
