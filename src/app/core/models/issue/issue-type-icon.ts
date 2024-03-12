import { IssueUtil } from '../../../shared/utils/issue.util';
import { IssueType } from '../../enums';

export class IssueTypeWithIcon {
  value: string;
  icon: string;

  constructor(issueType: IssueType) {
    this.value = issueType;
    this.icon = IssueUtil.getIssueTypeIcon(issueType);
  }
}