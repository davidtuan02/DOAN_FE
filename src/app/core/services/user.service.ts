import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import {
  map,
  distinctUntilChanged,
  tap,
  shareReplay,
  catchError,
} from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { User, AuthResponse } from '../models';
import { Router } from '@angular/router';
import { JwtService } from './jwt.service';
import { BASE_URL } from '../constants';
import { MockApiService } from './mock-api.service';
import { environment } from '../../../environments/environment';
import { throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser = this.currentUserSubject
    .asObservable()
    .pipe(distinctUntilChanged());

  public isAuthenticated = this.currentUser.pipe(
    map((user) => !!user),
    distinctUntilChanged()
  );

  private userLoaded = false;
  private userLoadInProgress = false;

  // Always use the real API
  private useMockApi = false;

  constructor(
    private readonly http: HttpClient,
    private readonly jwtService: JwtService,
    private readonly router: Router,
    private readonly mockApiService: MockApiService
  ) {}

  login(credentials: {
    username: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${BASE_URL}/auth/login`, {
        username: credentials.username,
        password: credentials.password,
      })
      .pipe(
        tap((response) => {
          this.setAuth(response.user, response.accessToken);
          this.userLoaded = true;
        })
      );
  }

  register(userData: {
    firstName: string;
    lastName: string;
    age: number;
    email: string;
    username: string;
    password: string;
    role: string;
  }): Observable<User> {
    return this.http
      .post<User>(`${BASE_URL}/users/create`, userData)
      .pipe(tap((user) => {}));
  }

  logout(): void {
    this.purgeAuth();
    void this.router.navigate(['/']);
  }

  getCurrentUser(): Observable<User> {
    // If we already have a user or are in the process of loading one, don't make another API call
    if (this.userLoaded && this.currentUserSubject.value) {
      return of(this.currentUserSubject.value);
    }

    if (this.userLoadInProgress) {
      // Just return the current user observable which will emit when loaded
      return this.currentUser.pipe(
        map((user) => {
          if (!user) throw new Error('User not available');
          return user;
        })
      );
    }

    this.userLoadInProgress = true;

    if (this.useMockApi) {
      return this.mockApiService.getProfile().pipe(
        tap((user) => {
          this.currentUserSubject.next(user);
          this.userLoaded = true;
          this.userLoadInProgress = false;
        }),
        catchError((err) => {
          this.userLoadInProgress = false;
          return throwError(() => err);
        }),
        shareReplay(1)
      );
    }

    return this.http.get<User>(`${BASE_URL}/auth/profile`).pipe(
      tap((user) => {
        this.currentUserSubject.next(user);
        this.userLoaded = true;
        this.userLoadInProgress = false;
      }),
      catchError((err) => {
        this.userLoadInProgress = false;
        return throwError(() => err);
      }),
      shareReplay(1)
    );
  }

  updateUser(userData: Partial<User>): Observable<User> {
    if (this.useMockApi) {
      return this.mockApiService.updateProfile(userData).pipe(
        tap((user) => {
          this.currentUserSubject.next(user);
        })
      );
    }

    return this.http.patch<User>(`${BASE_URL}/auth/profile`, userData).pipe(
      tap((user) => {
        this.currentUserSubject.next(user);
      })
    );
  }

  changePassword(
    currentPassword: string,
    newPassword: string
  ): Observable<void> {
    if (this.useMockApi) {
      return this.mockApiService.changePassword(currentPassword, newPassword);
    }

    return this.http.post<void>(`${BASE_URL}/auth/change-password`, {
      currentPassword,
      newPassword,
    });
  }

  setAuth(user: User, accessToken: string): void {
    if (accessToken) this.jwtService.saveToken(accessToken);
    this.currentUserSubject.next(user);
    this.userLoaded = true;
  }

  purgeAuth(): void {
    this.jwtService.destroyToken();
    this.currentUserSubject.next(null);
    this.userLoaded = false;
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${BASE_URL}/auth/forgot-password`,
      { email }
    );
  }

  resetPassword(
    token: string,
    newPassword: string
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${BASE_URL}/auth/reset-password`,
      { token, password: newPassword }
    );
  }

  // Helper method to enable/disable mock API
  setUseMockApi(useMock: boolean): void {
    this.useMockApi = useMock;
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${BASE_URL}/users/all`);
  }

  /**
   * Returns the current authenticated user's ID if available
   */
  getCurrentUserId(): string {
    const user = this.currentUserSubject.getValue();
    return user?.id || '';
  }

  getUsers(): Observable<User[]> {
    const jwtToken = this.jwtService.getToken();

    return this.http.get<User[]>(`${BASE_URL}/users`, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      }),
    });
  }
}
