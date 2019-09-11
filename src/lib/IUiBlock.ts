/**
 * Interface used to describe a UI element
 * used inside FUT emails.
 */
export interface IUiBlock {
  type: string;
  text?: string;
  html?: string;
  behavior?: string;
  action?: string;
  subject?: string;
  body?: string;
  url?: string;
  style?: string;
  className?: string;
}
