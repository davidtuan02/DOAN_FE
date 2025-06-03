export enum TeamRole {
  MANAGER = 'manager',
  LEADER = 'leader',
  MEMBER = 'member'
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
  canManageMembers: boolean;
  canManageProjects: boolean;
  canViewTeam: boolean;
  canViewMembers: boolean;
  canViewProjects: boolean;
}

export const TeamRolePermissions = {
  [TeamRole.MANAGER]: {
    canManageTeam: true,
    canManageMembers: true,
    canManageProjects: true,
    canViewTeam: true,
    canViewMembers: true,
    canViewProjects: true
  },
  [TeamRole.LEADER]: {
    canManageTeam: false,
    canManageMembers: true,
    canManageProjects: true,
    canViewTeam: true,
    canViewMembers: true,
    canViewProjects: true
  },
  [TeamRole.MEMBER]: {
    canManageTeam: false,
    canManageMembers: false,
    canManageProjects: false,
    canViewTeam: true,
    canViewMembers: true,
    canViewProjects: true
  }
};
