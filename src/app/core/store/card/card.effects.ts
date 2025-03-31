import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Injectable } from '@angular/core';

import {
  catchError,
  filter,
  map,
  mergeMap,
  withLatestFrom,
  tap,
} from 'rxjs/operators';
import { of } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { nanoid } from 'nanoid';

import * as actions from './card.actions';

import { BoardService } from '../../services/board.service';
import { CardState } from './card.reducers';
import { selectLatestOrdinalId, selectSelectedCardId } from './card.selectors';
import { Card, Comment } from '../../models';
import { selectCurrentUser } from '../user/user.selectors';

@Injectable()
export class CardEffects {
  getCards$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.getCards),
      mergeMap(() =>
        this.boardService.getBoardCards().pipe(
          map((cards) => actions.getCardsSuccess({ cards })),
          catchError((error) => of(actions.getCardsError({ error })))
        )
      )
    )
  );

  createCard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.createCard),
      withLatestFrom(
        this.store.pipe(select(selectLatestOrdinalId)),
        this.store.pipe(select(selectCurrentUser))
      ),
      mergeMap(([{ card }, ordinalId, user]) =>
        this.boardService.createCard(card).pipe(
          map((_) => {
            const createdCard: Card = {
              ...card,
              ordinalId: ordinalId + 1,
              assigneeId: user.id,
              reporterId: user.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            return actions.createCardSuccess({ card: createdCard });
          }),
          catchError((error) => of(actions.createCardError({ error })))
        )
      )
    )
  );

  updateCard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.updateCard),
      withLatestFrom(
        this.store.pipe(select((state: any) => state.cards.entities))
      ),
      mergeMap(([{ partial }, entities]) => {
        // Nếu card chưa tồn tại trong store, chúng ta cần thêm nó
        const cardExists = !!entities[partial.id];

        if (!cardExists) {
          console.log(
            'Card không tồn tại trong store, updating with new card:',
            partial.id
          );
          // Card không tồn tại, chỉ trả về action success mà không cần gọi API
          return of(actions.updateCardSuccess({ partial }));
        }

        // Card đã tồn tại, tiến hành cập nhật
        return this.boardService.updateCard(partial).pipe(
          map((_) => actions.updateCardSuccess({ partial })),
          catchError((error) => of(actions.updateCardError({ error })))
        );
      })
    )
  );

  getLabels$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.getLabels),
      mergeMap(() =>
        this.boardService.getLabels().pipe(
          map((labels) => actions.getLabelsSuccess({ labels })),
          catchError((error) => of(actions.getLabelsError({ error })))
        )
      )
    )
  );

  getComments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.getComments),
      mergeMap((_) =>
        this.boardService.getComments().pipe(
          map((comments) => actions.getCommentsSuccess({ comments })),
          catchError((error) => of(actions.getCommentsError({ error })))
        )
      )
    )
  );

  addComment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.addComment),
      withLatestFrom(this.store.pipe(select(selectSelectedCardId))),
      filter(([_, cardId]) => !!cardId),
      mergeMap(([{ comment }, cardId]) => {
        // Kiểm tra nếu content là rỗng hoặc chỉ chứa HTML trống
        if (
          !comment.content ||
          comment.content.trim() === '' ||
          comment.content === '<p></p>' ||
          comment.content === '<p><br></p>'
        ) {
          // Trả về action lỗi nếu comment rỗng
          return of(
            actions.addCommentError({
              error: 'Comment content cannot be empty',
            })
          );
        }

        const newComment: Comment = {
          ...comment,
          id: nanoid(),
          cardId: cardId || '',
          createdAt: new Date().toISOString(),
        };

        console.log(
          'Effect: Adding new comment to card:',
          cardId,
          'Content:',
          comment.content
        );

        return this.boardService.addComment(newComment).pipe(
          tap((response) =>
            console.log('Comment API response in effect:', response)
          ),
          map((_) => actions.addCommentSuccess({ comment: newComment })),
          catchError((error) => {
            console.error('Error in addComment effect:', error);
            return of(
              actions.addCommentError({
                error: error.message || 'Failed to add comment',
              })
            );
          })
        );
      })
    )
  );

  constructor(
    private actions$: Actions,
    private boardService: BoardService,
    private store: Store<CardState>
  ) {}
}
