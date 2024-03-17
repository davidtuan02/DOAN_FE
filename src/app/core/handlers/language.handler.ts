import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class LanguageHandler {
  //@Select(AuthState.getCurrentUser)
  //currentUser$: Observable<User>;

  get locale() {
    return this.translateService.currentLang;
  }

  constructor(private translateService: TranslateService) {
    //this.actions$.pipe(ofActionDispatched(UpdateState), take(1)).subscribe(() => this.initTranslate());
  }

  private initTranslate() {
    // const browserLang = navigator.language || navigator['userLanguage'];

    // this.currentUser$.pipe(filter(user => user && !!Object.keys(user).length)).subscribe(currentUser => {
    //   const userLang = currentUser.language;

    //   this.translateService.setDefaultLang(userLang || browserLang || 'tr-TR');
    //   this.translateService.use(userLang || browserLang || 'tr-TR');
    // });
  }
}
