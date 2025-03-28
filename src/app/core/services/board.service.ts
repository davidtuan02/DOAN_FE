import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { delay, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { Card, Column, Comment, PartialCard, User } from '../models';

@Injectable({ providedIn: 'root' })
export class BoardService {
  constructor(private httpClient: HttpClient) {}

  getBoardColumns(): Observable<Array<Column>> {
    const apiUrl = `./assets/data/columns.json`;

    return this.httpClient.get(apiUrl).pipe(
      map((r) => r as Column[]),
      delay(1000)
    );
  }

  getBoardCards(): Observable<Array<Card>> {
    const apiUrl = `./assets/data/cards.json`;

    return this.httpClient.get(apiUrl).pipe(
      map((r) => r as Card[]),
      delay(1000)
    );
  }

  getUsers(): Observable<Array<User>> {
    const apiUrl = `./assets/data/users.json`;

    return this.httpClient.get(apiUrl).pipe(
      map((r) => r as User[]),
      delay(1000)
    );
  }

  createCard(card: Card): Observable<unknown> {
    return of({}).pipe(delay(1000));
  }

  updateCard(card: PartialCard): Observable<unknown> {
    return of({}).pipe(delay(1000));
  }

  getLabels(): Observable<Array<string>> {
    const apiUrl = `./assets/data/labels.json`;

    return this.httpClient.get(apiUrl).pipe(
      map((r) => r as string[]),
      delay(1000)
    );
  }

  getComments(): Observable<Array<Comment>> {
    const apiUrl = `./assets/data/comments.json`;

    return this.httpClient.get(apiUrl).pipe(
      map((r) => r as Comment[]),

      delay(1000)
    );
  }

  addComment(comment: Comment): Observable<unknown> {
    return of({}).pipe(delay(1000));
  }
}
