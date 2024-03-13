import { HttpErrorResponse } from '@angular/common/http';

export function extractError(err: HttpErrorResponse) {
  if (err?.error?.message[0]?.message) {
    return err.error.message[0].message;
  } else {
    return err.error.message;
  }
}