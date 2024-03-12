import { IssuePriorityIcon, IssueTypeWithIcon } from "../models";
import { IssueType, IssuePriority, IssueStatus } from "../enums";
import { IssueUtil } from "../../shared/utils/issue.util";

export class IssueConsts {
  static PrioritiesWithIcon: IssuePriorityIcon[] = [
    IssueUtil.getIssuePriorityIcon(IssuePriority.LOW),
    IssueUtil.getIssuePriorityIcon(IssuePriority.MEDIUM),
    IssueUtil.getIssuePriorityIcon(IssuePriority.HIGH),
    IssueUtil.getIssuePriorityIcon(IssuePriority.HIGHEST)
  ];
  
  static IssueTypesWithIcon: IssueTypeWithIcon[] = [
    new IssueTypeWithIcon(IssueType.BUG),
    new IssueTypeWithIcon(IssueType.STORY),
    new IssueTypeWithIcon(IssueType.TASK)
  ];
  
  static IssueStatusDisplay = {
    [IssueStatus.BACKLOG]: 'Backlog',
    [IssueStatus.SELECTED]: 'Selected for Development',
    [IssueStatus.IN_PROGRESS]: 'In progress',
    [IssueStatus.DONE]: 'Done'
  };
  
  static IssuePriorityColors = {
    [IssuePriority.HIGHEST]: '#CD1317',
    [IssuePriority.HIGH]: '#E9494A',
    [IssuePriority.MEDIUM]: '#E97F33',
    [IssuePriority.LOW]: '#2D8738',
    [IssuePriority.LOWEST]: '#57A55A'
  }
}

