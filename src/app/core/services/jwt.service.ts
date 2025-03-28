import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class JwtService {
  private readonly JWT_TOKEN_KEY = 'jwtToken';

  getToken(): string | null {
    return window.localStorage.getItem(this.JWT_TOKEN_KEY);
  }

  saveToken(token: string): void {
    window.localStorage.setItem(this.JWT_TOKEN_KEY, token);
  }

  destroyToken(): void {
    window.localStorage.removeItem(this.JWT_TOKEN_KEY);
  }
}
