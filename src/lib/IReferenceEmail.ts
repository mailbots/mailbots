/**
 * Abstract, user editable instance of the email
 * associated with a task.
 */
export interface IReferenceEmail {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  reply_to: string;
  html: string;
  text: string;
}
