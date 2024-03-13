import { IssueType } from '../../enums';

export class IssueTypeWithIcon {
  value: string;
  icon: string;

  constructor(issueType: IssueType) {
    this.value = issueType;
    this.icon = issueType?.toLowerCase();
  }
}