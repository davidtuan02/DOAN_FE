import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs/operators';
import { NgIf, NgFor, NgClass } from '@angular/common';
import {
  ProjectService,
  Project,
} from '../../../../core/services/project.service';
import { TeamService } from '../../../../core/services/team.service';

@Component({
  selector: 'app-project-form',
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgFor, NgClass, NzMessageModule],
})
export class ProjectFormComponent implements OnInit {
  projectForm: FormGroup;
  isEditing = false;
  projectId: string | null = null;
  teamId: string | null = null;
  loading = false;
  submitting = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private route: ActivatedRoute,
    private router: Router,
    private message: NzMessageService
  ) {
    this.projectForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
        ],
      ],
      key: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(10),
          Validators.pattern('^[A-Z0-9]+$'),
        ],
      ],
      description: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(500),
        ],
      ],
    });
  }

  ngOnInit(): void {
    // Check if we're editing an existing project
    this.projectId = this.route.snapshot.paramMap.get('id');

    // Get teamId from query params (if provided)
    this.teamId = this.route.snapshot.queryParamMap.get('teamId');

    if (this.projectId) {
      this.isEditing = true;
      this.loadProjectDetails();
    }
  }

  loadProjectDetails(): void {
    if (!this.projectId) return;

    this.loading = true;
    this.projectService
      .getProjectById(this.projectId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (project) => {
          this.projectForm.patchValue({
            name: project.name,
            key: project.key,
            description: project.description,
          });
        },
        error: (err) => {
          this.error = 'Failed to load project details';
          console.error('Error loading project:', err);
          this.message.error('Failed to load project details');
        },
      });
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.projectForm.controls).forEach((key) => {
        const control = this.projectForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.submitting = true;
    this.error = null;

    const projectData = this.projectForm.value;

    if (this.isEditing) {
      this.updateProject(projectData);
    } else {
      this.createProject(projectData);
    }
  }

  createProject(projectData: any): void {
    this.submitting = true;
    console.log('Submitting project data:', projectData);
    console.log(
      'Current user ID:',
      this.projectService['userService'].getCurrentUserId()
    );
    console.log(
      'JWT Token:',
      this.projectService['userService']['jwtService'].getToken()
    );

    this.projectService
      .createProject(projectData)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (project) => {
          console.log('Project created successfully:', project);
          this.message.success('Project created successfully');

          // Nếu có teamId, gán project vào team
          if (this.teamId && project && project.id) {
            this.assignProjectToTeam(project.id, this.teamId);
          } else {
            // Navigate to the project or back to team projects
            if (this.teamId) {
              this.router.navigate(['/teams', this.teamId]);
            } else if (project.id) {
              this.router.navigate(['/projects', project.id]);
            } else {
              this.router.navigate(['/projects']);
            }
          }
        },
        error: (err) => {
          console.error('Full error object:', err);
          console.error('Error status:', err.status);
          console.error('Error headers:', err.headers);
          console.error('Error response:', err.error);

          let errorMessage = err.message || 'Failed to create project';
          if (err.status === 401) {
            errorMessage =
              'Unauthorized. Please log in again to create projects.';
          } else if (err.status === 403) {
            errorMessage = 'You do not have permission to create projects.';
          } else if (err.status === 500) {
            errorMessage = 'Server error occurred. Please try again later.';
          } else if (err.error && err.error.message) {
            errorMessage = err.error.message;
          }

          this.error = errorMessage;
          this.message.error(errorMessage);
          console.error('Error in createProject:', err);
        },
      });
  }

  assignProjectToTeam(projectId: string, teamId: string): void {
    console.log(`Assigning project ${projectId} to team ${teamId}`);

    this.projectService.assignProjectToTeam(projectId, teamId).subscribe({
      next: (response) => {
        console.log('Project assigned to team successfully:', response);
        this.message.success(
          'Project created and assigned to team successfully'
        );
        this.router.navigate(['/teams', teamId]);
      },
      error: (err) => {
        console.error('Error assigning project to team:', err);
        this.message.warning(
          'Project created but could not be assigned to team'
        );

        // Still navigate to the team since project was created
        this.router.navigate(['/teams', teamId]);
      },
    });
  }

  updateProject(projectData: any): void {
    if (!this.projectId) return;

    this.submitting = true;
    this.projectService
      .updateProject(this.projectId, projectData)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          this.message.success('Project updated successfully');

          // Navigate back to project details
          this.router.navigate(['/projects', this.projectId]);
        },
        error: (err) => {
          this.error = err.message || 'Failed to update project';
          this.message.error(this.error || 'Failed to update project');
          console.error('Error in updateProject:', err);
        },
      });
  }

  cancel(): void {
    if (this.isEditing && this.projectId) {
      this.router.navigate(['/projects', this.projectId]);
    } else if (this.teamId) {
      this.router.navigate(['/teams', this.teamId, 'projects']);
    } else {
      this.router.navigate(['/projects']);
    }
  }
}
