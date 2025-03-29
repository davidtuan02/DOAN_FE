# JIRA Clone Permission System

This document outlines the role-based permission system implemented in the JIRA clone application.

## User Roles

The system uses two types of roles:

### Global Roles

- **Admin**: Can manage teams but cannot create/manage projects or tasks
- **Basic**: Default role for all users, with permissions determined by team membership

### Team Roles

- **Leader**: Can create, edit, delete projects and manage tasks
- **Member**: Can create and edit their own tasks and participate in projects
- **Admin**: Can manage team members, promote members to leaders, but cannot manage projects or tasks

## Permission Matrix

| Role         | Manage Team | Manage Project | Manage Task  |
| ------------ | ----------- | -------------- | ------------ |
| Global Admin | ✅ Yes      | ❌ No          | ❌ No        |
| Team Admin   | ✅ Yes      | ❌ No          | ❌ No        |
| Team Leader  | ❌ No       | ✅ Yes         | ✅ Yes       |
| Basic Member | ❌ No       | ❌ No          | ✅ Own Tasks |

## Implementation Details

1. **Registration**: All new users are registered as BASIC role.
2. **Team Management**: Only global admins can create teams.
3. **Team Creation**: When an Admin creates a team, they automatically get the "admin" role in that team.
4. **Role Assignment**: Team admins can assign team roles, including promoting members to leaders.
5. **Project Management**: Only team leaders can create and manage projects.
6. **Task Management**:
   - Team leaders can manage all tasks
   - Basic members can only create and manage their own tasks

## Components

- `TeamPermissionsService`: Core service that manages permission checks
- `AdminGuard`: Protects routes accessible only to global admins
- `TeamPermissionGuard`: Checks team-based permissions
- `TaskOwnershipGuard`: Verifies if a user owns a task or has permission to manage it

## Flow Logic

1. Admin creates a team and automatically gets the "admin" role in that team
2. The team admin adds members to the team (with default "member" role)
3. Team admin can promote specific members to "leader" role
4. Team leaders can create and manage projects
5. Basic members can create tasks within projects they are assigned to

## Technical Implementation

The system uses Angular guards and services to enforce permissions across the application, and NestJS guards and decorators on the backend to secure API endpoints.

Guards check user roles and team membership before allowing access to protected routes or operations.
