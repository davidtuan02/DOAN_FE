export enum TeamRole {
  ADMIN = 'admin',
  LEADER = 'leader',
  MEMBER = 'member',
}

export interface TeamMember {
  id: string;
  role: TeamRole;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
}

export interface TeamRolePermission {
  canManageTeam: boolean;
  canManageProject: boolean;
  canManageTask: boolean;
  canEditTask: boolean;
}

export const teamRolePermissions: Record<TeamRole, TeamRolePermission> = {
  [TeamRole.ADMIN]: {
    canManageTeam: true,
    canManageProject: true,
    canManageTask: true,
    canEditTask: true,
  },
  [TeamRole.LEADER]: {
    canManageTeam: false,
    canManageProject: true,
    canManageTask: true,
    canEditTask: true,
  },
  [TeamRole.MEMBER]: {
    canManageTeam: false,
    canManageProject: false,
    canManageTask: false,
    canEditTask: true,
  },
};
