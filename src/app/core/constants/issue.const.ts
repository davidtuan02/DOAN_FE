import { IssuePriorityIcon, IssueTypeWithIcon } from "../models";
import { IssueType, IssuePriority, IssueStatus } from "../enums";

export const PrioritiesWithIcon: IssuePriorityIcon[] = [
  new IssuePriorityIcon(IssuePriority.LOW),
  new IssuePriorityIcon(IssuePriority.MEDIUM),
  new IssuePriorityIcon(IssuePriority.HIGH),
  new IssuePriorityIcon(IssuePriority.HIGHEST)
];

export const IssueTypesWithIcon: IssueTypeWithIcon[] = [
  new IssueTypeWithIcon(IssueType.BUG),
  new IssueTypeWithIcon(IssueType.STORY),
  new IssueTypeWithIcon(IssueType.TASK)
];

export const IssueStatusDisplay = {
  [IssueStatus.BACKLOG]: 'Backlog',
  [IssueStatus.SELECTED]: 'Selected for Development',
  [IssueStatus.IN_PROGRESS]: 'In progress',
  [IssueStatus.DONE]: 'Done'
};

export const IssuePriorityColors = {
  [IssuePriority.HIGHEST]: '#CD1317',
  [IssuePriority.HIGH]: '#E9494A',
  [IssuePriority.MEDIUM]: '#E97F33',
  [IssuePriority.LOW]: '#2D8738',
  [IssuePriority.LOWEST]: '#57A55A'
}

