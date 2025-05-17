import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../../core/services';
import {
  NzNotificationModule,
  NzNotificationService,
} from 'ng-zorro-antd/notification';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzNotificationModule],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
    >
      <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow-md">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        <div *ngIf="!tokenValid && !isLoading" class="text-center">
          <p class="text-red-500 mb-4">
            Invalid or expired password reset link. Please request a new one.
          </p>
          <button
            (click)="navigateToLogin()"
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          >
            Return to login
          </button>
        </div>

        <form
          *ngIf="tokenValid"
          class="mt-8 space-y-6"
          [formGroup]="resetForm"
          (ngSubmit)="onSubmit()"
        >
          <div *ngIf="errorMessage" class="text-red-500 text-sm font-medium">
            {{ errorMessage }}
          </div>

          <div class="rounded-md shadow-sm space-y-4">
            <div>
              <label
                for="password"
                class="block text-sm font-medium text-gray-700 mb-1"
                >New Password</label
              >
              <input
                id="password"
                name="password"
                type="password"
                formControlName="password"
                required
                class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="New password"
              />
              <div
                *ngIf="
                  resetForm.get('password')?.invalid &&
                  resetForm.get('password')?.touched
                "
                class="text-red-500 text-xs mt-1"
              >
                Password must be at least 8 characters
              </div>
            </div>

            <div>
              <label
                for="confirmPassword"
                class="block text-sm font-medium text-gray-700 mb-1"
                >Confirm Password</label
              >
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                formControlName="confirmPassword"
                required
                class="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm password"
              />
              <div
                *ngIf="resetForm.errors?.['passwordMismatch'] && resetForm.get('confirmPassword')?.touched"
                class="text-red-500 text-xs mt-1"
              >
                Passwords do not match
              </div>
            </div>

            <div
              *ngIf="passwordStrength > 0"
              class="w-full bg-gray-200 rounded-full h-2.5"
            >
              <div
                [ngClass]="passwordStrengthClass"
                [style.width.%]="passwordStrength"
                class="h-2.5 rounded-full transition-all duration-300"
              ></div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              [disabled]="resetForm.invalid || isLoading"
              class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              <span
                *ngIf="isLoading"
                class="absolute left-0 inset-y-0 flex items-center pl-3"
              >
                <svg
                  class="h-5 w-5 text-white animate-spin"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </span>
              Reset Password
            </button>
          </div>
        </form>

        <div *ngIf="successMessage" class="text-center">
          <div class="text-green-500 mb-4">{{ successMessage }}</div>
          <button
            (click)="navigateToLogin()"
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  token: string = '';
  isLoading = true;
  tokenValid = false;
  errorMessage = '';
  successMessage = '';
  passwordStrength = 0;
  passwordStrengthClass = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private notification: NzNotificationService
  ) {
    this.resetForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );

    this.resetForm.get('password')?.valueChanges.subscribe((password) => {
      this.calculatePasswordStrength(password);
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || '';

      if (!this.token) {
        this.tokenValid = false;
        this.isLoading = false;
        return;
      }

      // Normally, you would validate the token with the backend here
      // For now, we'll just assume it's valid if it exists
      this.tokenValid = true;
      this.isLoading = false;

      // For an actual implementation, you would verify the token with an API call like:
      /*
      this.userService.verifyResetToken(this.token).subscribe({
        next: () => {
          this.tokenValid = true;
          this.isLoading = false;
        },
        error: () => {
          this.tokenValid = false;
          this.isLoading = false;
        }
      });
      */
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null
      : { passwordMismatch: true };
  }

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

  onSubmit(): void {
    if (this.resetForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.userService
      .resetPassword(this.token, this.resetForm.value.password)
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          // this.successMessage = 'Your password has been reset successfully!';
          this.notification.success(
            'Success',
            `Your password has been reset successfully!`,
            { nzDuration: 3000 }
          );
          this.resetForm.reset();
          this.navigateToLogin();
        },
        error: (error) => {
          this.isLoading = false;
          this.notification.error(
            'Error',
            `Failed to reset password. Please try again.!`,
            { nzDuration: 3000 }
          );
          // this.errorMessage =
          //   error.error?.message ||
          //   'Failed to reset password. Please try again.';
          console.error('Password reset error:', error);
        },
      });
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
