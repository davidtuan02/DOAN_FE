import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { User, UserRole } from '../models';

@Injectable({
  providedIn: 'root',
})
export class MockApiService {
  private mockUser: User = {
    id: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    firstName: 'John',
    lastName: 'Doe',
    age: 30,
    email: 'john.doe@example.com',
    username: 'johndoe',
    role: UserRole.ADMIN,
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=random',
  };

  constructor() {}

  // Mock API for user profile
  getProfile(): Observable<User> {
    return of(this.mockUser).pipe(delay(500));
  }

  // Mock API for updating user profile
  updateProfile(userData: Partial<User>): Observable<User> {
    // Update mock user data
    this.mockUser = {
      ...this.mockUser,
      ...userData,
      updatedAt: new Date().toISOString(),
    };
    return of(this.mockUser).pipe(delay(500));
  }

  // Mock API for changing password
  changePassword(
    currentPassword: string,
    newPassword: string
  ): Observable<void> {
    // Simulate validation of current password
    if (currentPassword !== 'password') {
      return throwError(() => new Error('Current password is incorrect'));
    }
    return of(void 0).pipe(delay(500));
  }

  // Add other mock API methods as needed
}
