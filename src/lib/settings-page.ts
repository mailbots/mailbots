interface IJSONSchema {
  title?: string;
  type: string;
  description?: string;
  enum?: string[];
  properties?: {
    [key: string]: IJSONSchema;
  };
}

interface IUISchema {}

interface IFormData {
  [key: string]: any;
}

interface IFormMeta {
  hasSubmitButton?: boolean;
  submitText?: string;
  urlParams?: {
    [key: string]: string;
  };
  menuTitle: string;
}

interface ISettingsForm {
  JSONSchema: IJSONSchema;
  uiSchema: {
    [key: string]: IUISchema;
  };
  formData: IFormData;
  formMeta: IFormMeta;
}
interface IButton {
  text: string;
  href?: string;
  urlParams?: { [key: string]: string };
  className?: string;
  type?: "submit";
}

/**
 * Reference for `bot.webhook.settingsPage()`
 *
 *  Bots and bot skills can create settings settings pages which live
 * in `responseJson.settings[namespace]`. This class represents one
 * such settings form. Each settings form lives in its own namespace.
 * Instantiating a new SettingsPage adds a new namespace to
 * `responseJson.settings` key and populates it with React JSON Form
 * Schema JSON. https://github.com/mozilla-services/react-jsonschema-form
 * The MailBots Admin UI loops through namespaces, rendering forms appropriately.
 *
 * NOTE: This class directly mutates MailBot's response JSON to add
 * settings pages and form fields.
 *
 * @example const mySettingsPage = bot.webhook.settingsPage({
 *  namespace: "memorize",
 *  title: "Memorization Settings",
 *  menuTitle: "Memorization"
 * });
 *
 * // Add elements to the page
 * mySettingsPage.input({ name: "first_name"}); // renders text input
 *
 * @name bot.webook.settingsPage
 */
export default class SettingsPage {
  public settingsFormJSON: ISettingsForm;
  public JSONSchema: IJSONSchema;
  public uiSchema: {
    [key: string]: IUISchema;
  };
  public formData: IFormData;
  public formMeta: IFormMeta;
  public namespace: string;

  /**
   * Class constructor.
   * @param {object} params Object params
   * @param {object} params.responseJson Reference to MailBots responseJson obj
   * @param {string} params.title Display title of settings page
   * @param {string} params.menuTitle Menu name
   */
  constructor({
    responseJson,
    namespace,
    title = "",
    menuTitle
  }: {
    responseJson: {
      settings: {
        [key: string]: ISettingsForm;
      };
    };
    namespace: string;
    title?: string;
    menuTitle?: string;
  }) {
    if (!namespace) throw new Error("A namespace is required");
    this.namespace = namespace;

    // Schema describing a single settings page
    this.settingsFormJSON = {
      JSONSchema: {
        title,
        type: "object",
        properties: {
          // json schema properties populated by form helpers (as are the fields below)
        }
      },
      uiSchema: {
        // ui descriptions
      },
      formData: {
        // form values
      },
      formMeta: {
        // general / meta data about the form
        menuTitle: menuTitle || title || namespace
      }
    };

    // Validate form data. Just removes empties for now.
    // TODO: Validate schemas and UI elements, throw helpful errors
    const normalizeFormData = (settings?: { [key: string]: ISettingsForm }) =>
      settings || {};
    responseJson.settings = normalizeFormData(responseJson.settings);

    // Reference our new settings form on `responseJson.settings[namespace]`
    responseJson.settings[namespace] = this.settingsFormJSON;

    // Set up references for helper methods
    this.JSONSchema = this.settingsFormJSON.JSONSchema;
    this.uiSchema = this.settingsFormJSON.uiSchema;
    this.formData = this.settingsFormJSON.formData;
    this.formMeta = this.settingsFormJSON.formMeta;
  }

  /**
   * Retrieve the JSON Form Schema for this form
   * @returns {object} JSON Form Schema
   * @example const thisJsonSchema = settingsForm.getSettingsFormJSON();
   */
  getSettingsFormJSON() {
    return this.settingsFormJSON;
  }

  /**
   * Low-level function to insert raw JSONSchema and uiSchema to
   * create custom form elements.
   * Mozilla's React JSON Schema Form manages the form JSON and
   * UI JSON as two separate objects to keep the form JSON prestine and
   * compliant. This method lets us manage a form element in one place.
   * Ref: https://github.com/mozilla-services/react-jsonschema-form
   * @param {object} params
   * @param {object} params.name Namespace
   * @param {object} params.JSONSchema JSON Schema
   * @param {object} params.uiSchema Corresponding uiSchema
   *
   * This example is taken from https://mozilla-services.github.io/react-jsonschema-form/
   * @example formPage.insert({
      name: "first_name",
      JSONSchema: { type: "string", title: "First name" }, // JSON Schema
      uiSchema: { "ui:autofocus": true, "ui:emptyValue": "" } // UI Schema
    });
   */
  insert({
    name,
    JSONSchema,
    uiSchema
  }: {
    name: string;
    JSONSchema: IJSONSchema;
    uiSchema?: IUISchema;
  }) {
    if (this.settingsFormJSON.JSONSchema.properties)
      this.settingsFormJSON.JSONSchema.properties[name] = JSONSchema;
    if (uiSchema) {
      this.settingsFormJSON.uiSchema[name] = uiSchema;
    }
  }

  /**
   * Add text input field
   * @param {Object} params
   * @param {string} params.name
   * @param {string} params.title
   * @param {string} params.description
   * @param {string} params.helpText
   * @param {string} params.placeholder
   * @param {string} params.defaultValue
   * @example formPage.input({
   *   name: "first_name",
   *   title:"First Name"
   *   description: "Type your first name",
   *   helpText: "Hopefully you don't need help with this",
   *   placeholder: "(Ex: Bruce Lee)",
   *   defaultValue: "John Doe",
   * });
   */
  input({
    name,
    title,
    description,
    helpText,
    placeholder,
    defaultValue
  }: {
    name: string;
    title: string;
    description?: string;
    helpText?: string;
    placeholder?: string;
    defaultValue?: string;
  }) {
    if (this.JSONSchema.properties) {
      this.JSONSchema.properties[name] = {
        type: "string",
        title,
        description
      };
    }
    this.uiSchema[name] = {
      "ui:help": helpText,
      "ui:placeholder": placeholder,
      "ui:emptyValue": ""
    };
    if (defaultValue) {
      this.formData[name] = defaultValue;
    }
  }

  /**
   * Add textarea input
   * @param {Object} params
   * @param {string} params.name
   * @param {string} params.title
   * @param {string} params.description
   * @param {string} params.helpText
   * @param {string} params.placeholder
   * @param {string} params.defaultValue
   *
   * @example formPage.textarea({
   *   name: "life_story",
   *   title:"Life Story",
   *   description: "This is a long story",
   *   helpText: "Just start writing",
   *   placeholder: "Once upon a time...",
   *   defaultValue: "I was born, some time passed, now I'm here"
   * });
   */
  textarea({
    name,
    title,
    description,
    helpText,
    placeholder,
    defaultValue
  }: {
    name: string;
    title: string;
    description?: string;
    helpText?: string;
    placeholder?: string;
    defaultValue?: string;
  }) {
    if (this.JSONSchema.properties) {
      this.JSONSchema.properties[name] = {
        type: "string",
        title,
        description
      };
    }
    this.uiSchema[name] = {
      "ui:help": helpText,
      "ui:widget": "textarea",
      "ui:placeholder": placeholder,
      "ui:emptyValue": ""
    };
    if (defaultValue) {
      this.formData[name] = defaultValue;
    }
  }

  /**
   * Add checkbox field
   * @param {Object} params
   * @param {string} params.name
   * @param {string} params.title
   * @param {string} params.description
   * @param {string} params.helpText
   * @param {string} params.defaultValue
   *
   * @example formPage.checkbox({ name:"confirmation_emails", title:"Confirmation Emails"});
   */
  checkbox({
    name,
    title,
    description,
    helpText,
    defaultValue
  }: {
    name: string;
    title: string;
    description?: string;
    helpText?: string;
    defaultValue?: boolean;
  }) {
    if (this.JSONSchema.properties) {
      this.JSONSchema.properties[name] = {
        type: "boolean",
        title,
        description
      };
    }

    this.uiSchema[name] = {
      "ui:emptyValue": false,
      "ui:help": helpText
    };
    if (defaultValue) {
      this.formData[name] = defaultValue;
    }
  }

  /**
   * Add select dropdown
   * @param {Object} params
   * @param {string} params.name
   * @param {array} params.options Array of options
   * @param {string} params.title
   * @param {string} params.description
   * @param {string} params.helpText
   * @param {string} params.placeholder // when no option is selected
   * @param {string} params.defaultValue
   *
   * @example settingsPage.select({
   *   name: "favorite_color",
   *   title: "Favorite Color",
   *   description: "Which color do you like the best?",
   *   helpText: "Choose a color",
   *   options: ["red", "green", "blue"],
   *   defaultValue: "blue",
   *   placeholder: "Pick one!"
   *  });
   */
  select({
    name,
    title,
    description,
    helpText,
    options,
    placeholder,
    defaultValue
  }: {
    name: string;
    title: string;
    description?: string;
    helpText?: string;
    options: string[];
    placeholder?: string;
    defaultValue?: string;
  }) {
    if (!(options instanceof Array))
      throw new Error("options must be an array");
    if (this.JSONSchema.properties) {
      this.JSONSchema.properties[name] = {
        type: "string",
        description,
        title,
        enum: options
      };
    }
    this.uiSchema[name] = {
      "ui:help": helpText,
      "ui:placeholder": placeholder,
      "ui:emptyValue": ""
    };
    if (!title) {
      Object.assign(this.uiSchema[name], {
        "ui:options": {
          label: false
        }
      });
    }
    if (defaultValue) {
      this.formData[name] = defaultValue;
    }
  }

  /**
   * Adds a custom dialog at the top of the display form that can be used
   * for interrupt-messaging.
   * @param {object} params
   * @param {string} params.title Alert box title
   * @param {string} params.text Alert box text
   * @param {array} params.buttons Array of Button objects
   * @example formPage.alert({
   *   title: "Connect",
   *   text: "Connect GitHub",
   *   buttons: [{ text: "Submit", type: "Submit "}]
   * })
   *
   */
  alert({
    title,
    text,
    buttons = []
  }: {
    title?: string;
    text?: string;
    buttons?: IButton[];
  }) {
    const name = `_alert_${Math.random()
      .toString()
      .substr(2, 10)}`;
    if (this.JSONSchema.properties) {
      this.JSONSchema.properties[name] = {
        type: "string"
      };
    }

    if (this.JSONSchema.properties) {
      this.JSONSchema.properties[name] = {
        type: "string"
      };
    }

    this.uiSchema[name] = {
      "ui:widget": "customAlertWidget",
      "ui:options": {
        title,
        text,
        buttons,
        label: false
      },
      "ui:emptyValue": ""
    };
  }

  /**
   * Insert Video. Only YouTube supported for now.
   * @param {object} params
   * @param {string}  params.url URL of video
   * @param {string}  param.type YouTube only for now
   * @example formPage.video({
   *   url: "https://www.youtube.com/watch?v=y1GyXuU2J5k",
   *   type: "youtube"
   * })
   */
  video({ url = "", type = "youtube" }: { url?: string; type?: string }) {
    if (!url) throw new Error("A YouTube URL was not provided");
    if (type !== "youtube") throw new Error("Only type `youtube` is supported");
    const name = `_md_${Math.random()
      .toString()
      .substr(2, 10)}`;
    if (this.JSONSchema.properties) {
      this.JSONSchema.properties[name] = {
        type: "string"
      };
    }

    this.uiSchema[name] = {
      "ui:widget": "customYouTubeEmbedWidget",
      classNames: "embed-responsive embed-responsive-16by9 golden-ratio-16by9",
      "ui:options": {
        url,
        label: false
      },
      "ui:emptyValue": ""
    };
  }

  /**
   * Insert custom button
   * @param {object} params
   * @param {string}  params.url URL of video
   * @example formPage.button({
   *   text: "Google"
   *   href: "https://www.google.com"
   * });
   */
  button({ text, href = "", urlParams, className, type }: IButton) {
    const name = `_md_${Math.random()
      .toString()
      .substr(2, 10)}`;
    if (this.JSONSchema.properties) {
      this.JSONSchema.properties[name] = {
        type: "string"
      };
    }

    this.uiSchema[name] = {
      "ui:widget": "customButtonWidget",
      "ui:options": {
        text,
        href,
        label: false,
        className,
        urlParams,
        type,
        namespace: this.namespace // submit buttons point to an instance of a form
      },
      "ui:emptyValue": ""
    };
  }

  /**
   * Set URL params in the onSettingsSubmit webhook and onSettingsViewed hook
   * (ex: ?success=true to show a success dialog)
   * This provides for an accurate mental model, but internally jumps through a number
   * of hoops to get this URL to appear in the admin UI.
   * NOTE: To get current URL params, use bot.get("url_params")
   * @param params key value url params
   */
  setUrlParams(urlParams: { [key: string]: string }) {
    this.formMeta.urlParams = urlParams;
  }

  /**
   * Add a text block. Markdown supported!
   * @param {string} text – Text with optional markdown
   *
   * Note: This field is whitespace sensitive. New lines
   * cannot have leading spaces.
   * @example  formPage.text(`--------------
   *## ️⚠️ Connect Github
   *This is a text block here. Leading spaces can break this.
   *And this is a new line.
   *
   *[Connect Github](http://www.google.com)
   *
   *------------------
   *`);
   *
   */
  text(text: string) {
    const name = `_md_${Math.random()
      .toString()
      .substr(2, 10)}`;
    if (this.JSONSchema.properties) {
      this.JSONSchema.properties[name] = {
        type: "string"
      };
    }
    this.uiSchema[name] = {
      "ui:widget": "customTextWidget",
      "ui:emptyValue": "",
      "ui:options": {
        label: false,
        text
      }
    };
  }

  /**
   * Render a hidden input field. Useful for submitting
   * values behind the scenes.
   * @param {object} params
   * @param {string} params.name Field name
   * @param {string} params.value Field value
   * @example formPage.hiddenInput({
   *   name: "key",
   *   value: "value"
   * });
   */
  hiddenInput({
    name,
    value,
    defaultValue
  }: {
    name: string;
    value?: string;
    defaultValue: string;
  }) {
    if (this.JSONSchema.properties) {
      this.JSONSchema.properties[name] = {
        type: "string"
      };
    }
    this.uiSchema[name] = {
      "ui:widget": "hidden",
      "ui:emptyValue": ""
    };
    if (value) {
      this.formData[name] = defaultValue;
    }
  }

  /**
   * Render a submit button for the form. (Submit button is not included
   * automatically). URL params can optionally be passed which makes
   * them available to the next handler. Make sure to validate URL input.
   * @param {object} params
   * @param {string} params.submitText
   * @param {object} params.urlParams Key value of url params
   *
   * @example formPage.submitButton({
   *   submitText: "Save Settings",
   *   urlParams: { key: "value" }
   * });
   */
  submitButton({
    submitText,
    urlParams
  }: {
    submitText?: string;
    urlParams?: {
      [key: string]: string;
    };
  } = {}) {
    this.formMeta.hasSubmitButton = true;
    this.formMeta.submitText = submitText || "Save Settings";
    this.formMeta.urlParams = urlParams || {};
  }

  /**
   * Populate form data, overwriting default values with those newly passed.
   * MailBots JSON form data for this namespace can be passed directly to this
   * method to populate the form values.
   * @param {object} formData JSON object containing form values.
   * @example
   * const storedData = mailbots.webhook.getMailBotData("mem", {});
   * formPage.populate(storedData);
   */
  populate(formData: IFormData) {
    Object.assign(this.formData, formData);
  }
}
