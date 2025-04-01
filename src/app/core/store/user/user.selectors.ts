import { selectUserState, userAdapter } from './user.reducers';
import { createSelector } from '@ngrx/store';

const {
  selectIds: selectUserIds,
  selectEntities: selectUserEntities,
  selectAll: selectAllUsers,
  selectTotal: selectTotalUsers,
} = userAdapter.getSelectors();

export const allUsers = createSelector(selectUserState, selectAllUsers);

export const selectUsersByIds = (ids: Array<string> | undefined) =>
  createSelector(allUsers, (users) => {
    if (!!users && !!ids) {
      return users.filter((u) => ids.includes(u.id));
    }

    return [];
  });

export const selectUserById = (id: string | undefined) =>
  createSelector(allUsers, (users) => {
    console.log('Selecting user by id:', id, 'from users:', users);
    if (!!users && !!id) {
      const foundUser = users.find((u) => u.id === id);
      console.log('Found user:', foundUser);
      return foundUser;
    }

    return null;
  });

// This just return the first user in the users list :)
export const selectCurrentUser = createSelector(allUsers, (users) => users[0]);
