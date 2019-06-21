/**
 * Data sent over by the mailbots core API
 * as payload to web hook events.
 */
export interface IWebHook {
  version: string;
  trigger: {
    triggered_by: string;
    uri: string;
    headers: {
      [key: string]: string;
    };
    method: string;
    body_text: string;
    body_json: any[];
  };
  event: string;
  task: {
    created: number;
    completed: boolean;
    completed_on: string;
    hash: string;
    id: number;
    trigger_time: number;
    trigger_timeformat: string;
    reference_email: {
      to: string[];
      cc: string[];
      bcc: string[];
      from: string;
      reply_to: string;
      subject: string;
      html: string;
      text: string;
      attachments: any[];
    };
    command: string;
    stored_data: {
      [key: string]: any;
    };
  };
  user: {
    id: number;
    name: string;
    primary_email: string;
    emails: string[];
    is_validated: boolean;
    timezone: string;
    preferred_date_format: string;
    preferred_date_format_js: string;
    postpone_times: string;
    flagged: number;
    sender_validation: number;
    send_dev_errors: boolean;
    accepted_terms: boolean;
  };
  mailbot: {
    name: string;
    subdomain: string;
    stored_data: {
      [key: string]: any;
    };
    installed: boolean;
    event_url: string;
    id: number;
    owner: {
      email: string;
    };
    description: string;
    icon: string;
    autocomplete_examples: string;
    tags: string;
    published: boolean;
    devmode: boolean;
    enabled: boolean;
    install_url: string;
    settings_url: string;
    base_url: string;
    developer_name: string;
    help_url: string;
    learn_more_url: string;
    privacy_policy_url: string;
    oauth2_client_id: string;
    oauth2_scope: string;
    oauth2_redirect_uri: string;
  };
}
