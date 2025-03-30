import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  TeamService,
  TeamAccess,
} from '../../../../core/services/team.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  ProjectService,
  Project,
} from '../../../../core/services/project.service';
import { catchError, map, of, forkJoin } from 'rxjs';

@Component({
  selector: 'app-team-projects',
  templateUrl: './team-projects.component.html',
  styleUrls: ['./team-projects.component.scss'],
})
export class TeamProjectsComponent implements OnInit {
  @Input() teamId: string = '';

  projects: Project[] = [];
  filteredProjects: Project[] = [];
  loading = false;
  error: string | null = null;
  searchTerm = '';

  // For deleting project
  isDeleteModalVisible = false;
  deleteLoading = false;
  projectToDelete: Project | null = null;

  // For creating/editing project
  projectForm: FormGroup;
  isProjectModalVisible = false;
  isEditing = false;
  currentProject: Project | null = null;
  submitting = false;

  // For viewing project
  isViewModalVisible = false;
  selectedProject: Project | null = null;

  // Team access
  canManageTeam = false;
  teamAccess: TeamAccess | null = null;

  constructor(
    private teamService: TeamService,
    private projectService: ProjectService,
    private router: Router,
    private message: NzMessageService,
    private fb: FormBuilder
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
    if (this.teamId) {
      this.loadProjects();
      this.checkTeamAccess();
    }
  }

  loadProjects(): void {
    this.loading = true;
    console.log(`Loading projects for team ${this.teamId}`);

    this.projectService
      .getProjectsByTeam(this.teamId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (projects) => {
          console.log(`Received ${projects.length} projects:`, projects);
          this.projects = projects;
          // Load detailed information for each project
          this.loadProjectDetails();
        },
        error: (err) => {
          console.error('Error loading team projects:', err);
          const errorMsg = err.message || 'Failed to load team projects';
          this.error = errorMsg;
          this.message.error(errorMsg);
        },
      });
  }

  // Load detailed information for each project
  loadProjectDetails(): void {
    if (this.projects.length === 0) {
      this.filteredProjects = [];
      return;
    }

    const projectDetailsRequests = this.projects.map((project) => {
      if (!project.id) return of(project);

      return this.projectService.getProjectById(project.id).pipe(
        catchError((error) => {
          console.error(
            `Error loading details for project ${project.id}:`,
            error
          );
          return of(project); // Return original project on error
        })
      );
    });

    forkJoin(projectDetailsRequests)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe((detailedProjects: Project[]) => {
        this.projects = detailedProjects;
        this.filteredProjects = [...this.projects];
      });
  }

  // Assign an existing project to this team
  assignExistingProject(projectId: string): void {
    if (!this.canManageTeam || !this.teamId) {
      this.message.error(
        'You do not have permission to assign projects to this team'
      );
      return;
    }

    this.projectService.assignProjectToTeam(projectId, this.teamId).subscribe({
      next: (project) => {
        this.message.success(
          `Project "${project.name}" assigned to team successfully`
        );
        this.loadProjects(); // Reload the projects
      },
      error: (err) => {
        this.message.error(err.message || 'Failed to assign project to team');
        console.error('Error assigning project to team:', err);
      },
    });
  }

  // Check team access permissions
  checkTeamAccess(): void {
    this.teamService.validateTeamAccess(this.teamId).subscribe({
      next: (access) => {
        this.teamAccess = access;
        this.canManageTeam =
          access.role === 'leader' || access.role === 'admin';
      },
      error: (err) => {
        console.error('Failed to validate team access', err);
      },
    });
  }

  createProject(): void {
    // Show create project modal
    this.isEditing = false;
    this.currentProject = null;
    this.projectForm.reset({ name: '', key: '', description: '' });
    this.isProjectModalVisible = true;
  }

  viewProject(projectId: string): void {
    // Find the project and show view modal
    const project = this.projects.find((p) => p.id === projectId);
    if (project) {
      this.selectedProject = project;
      this.isViewModalVisible = true;
    }
  }

  editProject(project: Project): void {
    if (!project.id) return;

    console.log('Editing project:', project);

    // Show edit project modal
    this.isEditing = true;
    this.currentProject = project;

    // Make sure to include key field
    this.projectForm.patchValue({
      name: project.name,
      key: project.key || '',
      description: project.description,
    });

    this.isProjectModalVisible = true;
  }

  confirmDeleteProject(project: Project): void {
    if (!project.id) return;
    console.log('Confirming deletion of project:', project);
    this.projectToDelete = project;
    this.isDeleteModalVisible = true;
  }

  handleDeleteCancel(): void {
    this.isDeleteModalVisible = false;
    this.projectToDelete = null;
  }

  handleDeleteOk(): void {
    if (!this.projectToDelete || !this.projectToDelete.id) return;

    this.deleteLoading = true;
    const projectId = this.projectToDelete.id;
    const projectName = this.projectToDelete.name;

    console.log('Deleting project:', this.projectToDelete);

    this.projectService
      .deleteProject(projectId)
      .pipe(
        finalize(() => {
          this.deleteLoading = false;
          this.isDeleteModalVisible = false;
        })
      )
      .subscribe({
        next: (result) => {
          console.log('Project deleted successfully:', result);

          // Remove the project from the lists
          this.projects = this.projects.filter((p) => p.id !== projectId);
          this.filteredProjects = this.filteredProjects.filter(
            (p) => p.id !== projectId
          );

          this.message.success(`Project "${projectName}" has been deleted`);
          this.projectToDelete = null;
        },
        error: (err) => {
          console.error('Full error object:', err);
          const errorMsg = err.message || 'Failed to delete project';
          this.message.error(`Failed to delete project: ${errorMsg}`);
          console.error('Error deleting project:', err);

          // Show detailed error information
          if (err.error) {
            console.error('Error details:', err.error);
          }
        },
      });
  }

  // Handle project form submission
  handleProjectSubmit(): void {
    if (this.projectForm.invalid) {
      // Mark fields as touched to show validation messages
      Object.keys(this.projectForm.controls).forEach((key) => {
        const control = this.projectForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.submitting = true;
    const projectData = this.projectForm.value;

    console.log('Submitting project form with data:', projectData);
    console.log(
      'Current user ID:',
      this.projectService['userService'].getCurrentUserId()
    );
    console.log(
      'JWT Token:',
      this.projectService['userService']['jwtService'].getToken()
    );

    if (this.isEditing && this.currentProject?.id) {
      // Update existing project
      console.log('Updating project ID:', this.currentProject.id);

      this.projectService
        .updateProject(this.currentProject.id, projectData)
        .pipe(finalize(() => (this.submitting = false)))
        .subscribe({
          next: (result) => {
            console.log('Project updated successfully:', result);
            this.message.success('Project updated successfully');
            this.isProjectModalVisible = false;
            this.loadProjects(); // Reload projects to get updated data
          },
          error: (err) => {
            console.error('Full error object:', err);
            const errorMsg = err.message || 'Failed to update project';
            this.message.error(errorMsg);
            console.error('Error updating project:', err);

            // Show detailed error information
            if (err.error) {
              console.error('Error details:', err.error);
            }
            if (err.status) {
              console.error('Error status:', err.status);

              if (err.status === 401) {
                this.message.error(
                  'Unauthorized. Please log in again to update projects.'
                );
              } else if (err.status === 403) {
                this.message.error(
                  'You do not have permission to update this project.'
                );
              } else if (err.status === 500) {
                this.message.error('Server error. Please try again later.');
              }
            }
          },
        });
    } else {
      // Create new project and automatically assign to team using the teamId parameter
      console.log('Creating new project with team ID:', this.teamId);

      this.projectService
        .createProject(projectData, this.teamId)
        .pipe(finalize(() => (this.submitting = false)))
        .subscribe({
          next: (newProject) => {
            console.log('Project created successfully:', newProject);
            this.message.success(
              'Project created and assigned to team successfully'
            );
            this.isProjectModalVisible = false;
            this.loadProjects(); // Reload projects to get updated data
          },
          error: (err) => {
            console.error('Full error object:', err);
            let errorMsg = err.message || 'Failed to create project';

            // Check if the error is related to board creation
            if (errorMsg.includes('board')) {
              this.message.warning(
                'Project was created, but there was an issue creating the default board. Some features may be limited.'
              );
              // Still close the modal and reload since the project was created
              this.isProjectModalVisible = false;
              this.loadProjects();
              return;
            }

            this.message.error(errorMsg);
            console.error('Error creating project:', err);

            // Show detailed error information
            if (err.error) {
              console.error('Error details:', err.error);
            }
            if (err.status) {
              console.error('Error status:', err.status);

              if (err.status === 401) {
                this.message.error(
                  'Unauthorized. Please log in again to create projects.'
                );
              } else if (err.status === 403) {
                this.message.error(
                  'You do not have permission to create projects.'
                );
              } else if (err.status === 500) {
                this.message.error('Server error. Please try again later.');
              }
            }
          },
        });
    }
  }

  // Handle view project modal close
  closeViewModal(): void {
    this.isViewModalVisible = false;
    this.selectedProject = null;
  }

  // Handle project form modal close
  closeProjectModal(): void {
    this.isProjectModalVisible = false;
    this.currentProject = null;
    this.projectForm.reset();
  }

  onSearch(): void {
    this.applySearch();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filteredProjects = [...this.projects];
  }

  applySearch(): void {
    const search = this.searchTerm.toLowerCase().trim();

    if (!search) {
      this.filteredProjects = [...this.projects];
      return;
    }

    this.filteredProjects = this.projects.filter(
      (project) =>
        project.name.toLowerCase().includes(search) ||
        (project.key && project.key.toLowerCase().includes(search)) ||
        (project.description &&
          project.description.toLowerCase().includes(search))
    );
  }

  getProjectHeaderClass(project: Project): string {
    if (!project.status) return 'bg-blue-50';

    switch (project.status.toLowerCase()) {
      case 'completed':
        return 'bg-green-50';
      case 'active':
        return 'bg-blue-50';
      case 'archived':
        return 'bg-gray-50';
      default:
        return 'bg-blue-50';
    }
  }

  getProjectIconClass(project: Project): string {
    if (!project.status) return 'bg-blue-100 text-blue-600';

    switch (project.status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-600';
      case 'active':
        return 'bg-blue-100 text-blue-600';
      case 'archived':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-blue-100 text-blue-600';
    }
  }

  getDaysRemaining(project: Project): string {
    if (!project.deadline) {
      return 'No deadline';
    }

    const deadline = new Date(project.deadline);
    const today = new Date();

    // Reset time part to compare dates only
    deadline.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return '1 day left';
    } else {
      return `${diffDays} days left`;
    }
  }

  getCompletionPercentage(project: Project): number {
    if (!project.totalTasks || project.totalTasks === 0) {
      return 0;
    }
    return Math.round(
      ((project.completedTasks || 0) / project.totalTasks) * 100
    );
  }

  isOverdue(project: Project): boolean {
    if (!project.deadline) return false;
    const deadline = new Date(project.deadline);
    return deadline < new Date();
  }

  isApproachingDeadline(project: Project): boolean {
    if (!project.deadline) return false;
    const deadline = new Date(project.deadline);
    const today = new Date();
    const daysUntilDeadline = Math.ceil(
      (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilDeadline > 0 && daysUntilDeadline <= 7;
  }
}
