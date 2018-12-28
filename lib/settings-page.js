/**
 * Bots and bot skills can create settings settings pages which live
 * in `responseJson.settings[namespace]`. This class represents one
 * such settings form. Each settings form lives in its own namespace.
 * Instantiating a new SettingsPage adds a new namespace to
 * `responseJson.settings` key and populates it with React JSON Form
 * Schema JSON. https://github.com/mozilla-services/react-jsonschema-form
 * The Gopher Admin UI loops through namespaces, rendering forms appropriately.
 *
 * NOTE: This class directly mutates MailBot's response JSON to add
 * settings pages and form fields.
 *
 */
class SettingsPage {
  /**
   * @param {object} params
   * @param {object} params.responseJson Reference to MailBots responseJson obj
   * @param {string} params.title Display title of settings page
   * @param {string} params.menuTitle Menu name
   */
  constructor({ responseJson, namespace, title = "", menuTitle }) {
    if (!namespace) throw new Error("A namespace is required");

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
    const normalizeFormData = settings => settings || {};
    responseJson.settings = normalizeFormData(responseJson.settings);

    // Reference our new settings form on `responseJson.settings[namespace]`
    responseJson.settings[namespace] = this.settingsFormJSON;

    // Set up references for helper methods
    this.JSONSchema = this.settingsFormJSON.JSONSchema;
    this.formMeta = this.settingsFormJSON.formMeta;
    this.uiSchema = this.settingsFormJSON.uiSchema;
    this.formData = this.settingsFormJSON.formData;
  }

  getSettingsFormJSON() {
    return this.settingsFormJSON;
  }

  /**
   * Low-level function to insert raw JSONSchema and uiSchema to create custom form elements.
   */
  insert({ name, JSONSchema, uiSchema }) {
    this.settingsFormJSON.JSONSchema.properties[name] = JSONSchema;
    if (uiSchema) {
      this.settingsFormJSON.uiSchema[name] = uiSchema;
    }
  }

  /**
   * Inset text input
   * @param {Object} params
   * @param {string} params.name
   * @param {string} params.title
   * @param {string} params.description
   * @param {string} params.helpText
   * @param {string} params.placeholder
   * @param {string} params.defaultValue
   * @example
   * formPage.input({ name:"Confirmation Emails"});
   */
  input({ name, title, description, helpText, placeholder, defaultValue }) {
    this.JSONSchema.properties[name] = {
      type: "string",
      title,
      description
    };
    this.uiSchema[name] = {
      "ui:help": helpText,
      "ui:placeholder": placeholder,
      "ui:emptyValue": ""
    };
    if (defaultValue) {
      this.formData[name] = defaultValue;
    }
  }

  textarea({ name, title, description, helpText, placeholder, defaultValue }) {
    this.JSONSchema.properties[name] = {
      type: "string",
      title,
      description
    };
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

  checkbox({ name, title, description, helpText, defaultValue }) {
    this.JSONSchema.properties[name] = {
      type: "boolean",
      title,
      description
    };
    this.uiSchema[name] = {
      "ui:emptyValue": false,
      "ui:help": helpText
    };
    if (defaultValue) {
      this.formData[name] = defaultValue;
    }
  }

  select({
    name,
    title,
    description,
    helpText,
    options,
    placeholder,
    defaultValue
  }) {
    if (!options instanceof Array) throw new Error("options must be an array");
    this.JSONSchema.properties[name] = {
      type: "string",
      description,
      title,
      enum: options
    };
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

  // Adds a custom dialog at the top of the display form that can be used
  // for interrupt-messaging. Settings forms with alert dialogs are prioritize above
  // other settings in the MailBots Admin UI.
  alert({ title, text, linkText, linkHref }) {
    if (this.JSONSchema.properties.alert) {
      console.warn(
        `A settings form can only have one alert. The "${title}" alert will not be shown. `
      );
      return;
    }
    this.JSONSchema.properties.alert = {
      type: "string"
    };
    this.uiSchema.alert = {
      "ui:widget": "customAlertWidget",
      "ui:options": {
        title,
        text,
        linkText,
        linkHref,
        label: false
      }
    };
    this.uiSchema.alert = {
      "ui:emptyValue": ""
    };
  }

  video({ url = "", type = "youtube" }) {
    if (!url) throw new Error("A YouTube URL was not provided");
    if (type !== "youtube") throw new Error("Only type `youtube` is supported");
    const name = `_md_${Math.random()
      .toString()
      .substr(2, 10)}`;
    this.JSONSchema.properties[name] = {
      type: "string"
    };

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

  // A custom, markdown-enabled way to add markdown to the form
  text(text) {
    const name = `_md_${Math.random()
      .toString()
      .substr(2, 10)}`;
    this.JSONSchema.properties[name] = {
      type: "string"
    };
    this.uiSchema[name] = {
      "ui:widget": "customTextWidget",
      "ui:emptyValue": "",
      "ui:options": {
        label: false,
        text
      }
    };
  }

  // Hidden input
  hiddenInput({ name, value }) {
    this.JSONSchema.properties[name] = {
      type: "string"
    };
    this.uiSchema[name] = {
      "ui:widget": "hidden",
      "ui:emptyValue": ""
    };
    if (value) {
      this.formData[name] = defaultValue;
    }
  }

  // Add custom submit button, allow URL params to be passed
  // Submit button is not rendered if not passed
  submitButton({ submitText, urlParams } = {}) {
    this.formMeta.hasSubmitButton = true;
    this.formMeta.submitText = submitText || "Save Settings";
    this.formMeta.urlParams = urlParams || {};
  }

  // Populate form data, overwriting default values with those newly passed
  populate(formData) {
    Object.assign(this.formData, formData);
  }
}

module.exports = SettingsPage;
