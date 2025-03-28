import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="p-4 rounded-md">
      <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-4"
              >Email</label
            >
            <div class="relative">
              <input
                type="email"
                formControlName="email"
                class="w-full px-4 py-2 pl-10 border rounded-md"
                placeholder="Enter your email"
              />
              <span class="absolute left-3 top-2.5 text-gray-400">
                <i class="fas fa-envelope"></i>
              </span>
            </div>
            <div
              *ngIf="forgotPasswordForm.get('email')?.errors?.['required'] && forgotPasswordForm.get('email')?.touched"
              class="text-sm text-red-500"
            >
              Email is required
            </div>
            <div
              *ngIf="forgotPasswordForm.get('email')?.errors?.['email'] && forgotPasswordForm.get('email')?.touched"
              class="text-sm text-red-500"
            >
              Please enter a valid email
            </div>
          </div>
        </div>
      </form>
    </div>
  `,
})
export class ForgotPasswordModalComponent {
  forgotPasswordForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      // The form will be handled by the parent component
      return;
    }
  }
}
