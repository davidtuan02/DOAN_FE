import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Team, TeamService } from '../../../../core/services/team.service';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs/operators';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-team-form',
  templateUrl: './team-form.component.html',
  styleUrls: ['./team-form.component.scss'],
  providers: [DatePipe],
})
export class TeamFormComponent implements OnInit {
  @Input() team?: Team;
  @Input() loading = false;
  @Input() isStandalone = false;
  @Output() formSubmit = new EventEmitter<{
    name: string;
    description?: string;
  }>();
  @Output() cancel = new EventEmitter<void>();

  teamForm!: FormGroup;
  submitting = false;
  error: string | null = null;
  isAuthenticated = false;

  // For breadcrumbs when used as standalone
  breadcrumbs = [
    { label: 'Teams', route: '/teams' },
    { label: 'Create Team', route: '' },
  ];

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private router: Router,
    private route: ActivatedRoute,
    private message: NzMessageService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    // Check authentication status
    this.userService.isAuthenticated.subscribe((isAuth) => {
      this.isAuthenticated = isAuth;
      if (!isAuth && this.isStandalone) {
        this.error = 'You must be logged in to create or edit a team';
        this.message.error('Authentication required');
        this.router.navigate(['/login']);
      }
    });

    // Check if we're in standalone mode based on route data
    this.route.data.subscribe((data) => {
      if (data['isStandalone']) {
        this.isStandalone = true;
      }
    });

    this.initForm();

    // Check if we're in standalone edit mode
    if (this.isStandalone) {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.loadTeam(id);
        this.breadcrumbs[1].label = 'Edit Team';
      }
    }
  }

  loadTeam(id: string): void {
    this.loading = true;
    this.teamService
      .getTeamById(id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (team) => {
          this.team = team;
          this.initForm(); // Re-initialize form with team data
        },
        error: (err) => {
          this.error = 'Failed to load team';
          console.error(err);
        },
      });
  }

  initForm(): void {
    this.teamForm = this.fb.group({
      name: [
        this.team?.name || '',
        [Validators.required, Validators.maxLength(100)],
      ],
      description: [this.team?.description || ''],
    });
  }

  onSubmit(): void {
    if (!this.isAuthenticated) {
      this.error = 'You must be logged in to create or edit a team';
      this.message.error('Authentication required');
      this.router.navigate(['/login']);
      return;
    }

    if (this.teamForm.valid) {
      if (this.isStandalone) {
        this.submitting = true;

        if (this.team?.id) {
          // Update existing team
          this.teamService
            .updateTeam(this.team.id, this.teamForm.value)
            .pipe(finalize(() => (this.submitting = false)))
            .subscribe({
              next: (team) => {
                this.message.success(
                  `Team "${team.name}" updated successfully`
                );
                this.router.navigate(['/teams', team.id]);
              },
              error: (err) => {
                this.error = err.error?.message || 'Failed to update team';
                this.message.error(this.error || 'Failed to update team');
                console.error(err);
              },
            });
        } else {
          // Create new team
          this.teamService
            .createTeam(this.teamForm.value)
            .pipe(finalize(() => (this.submitting = false)))
            .subscribe({
              next: (team) => {
                this.message.success(
                  `Team "${team.name}" created successfully`
                );
                this.router.navigate(['/teams', team.id]);
              },
              error: (err) => {
                this.error = err.error?.message || 'Failed to create team';
                this.message.error(this.error || 'Failed to create team');
                console.error(err);
              },
            });
        }
      } else {
        // Just emit the form data, parent component will handle the API call
        this.formSubmit.emit(this.teamForm.value);
      }
    } else {
      this.teamForm.markAllAsTouched();
    }
  }

  onCancel(): void {
    if (this.isStandalone) {
      this.router.navigate(['/teams']);
    } else {
      this.cancel.emit();
    }
  }
}
