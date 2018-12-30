/**
 * Create a new settings page
 *
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
 * @example const mySettingsPage = gopher.webhook.settingsPage({
 *  namespace: "memorize",
 *  title: "Memorization Settings",
 *  menuTitle: "Memorization"
 * });
 *
 * // Add elements to the page
 * mySettingsPage.input({ name: "first_name"}); // renders text input
 *
 *
 * @param {object} params Object params
 * @param {object} params.responseJson Reference to MailBots responseJson obj
 * @param {string} params.title Display title of settings page
 * @param {string} params.menuTitle Menu name
 */

class SettingsPage {
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
  insert({ name, JSONSchema, uiSchema }) {
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

  /**
   * Add checkbox field
   * @param {Object} params
   * @param {string} params.name
   * @param {string} params.title
   * @param {string} params.description
   * @param {string} params.helpText
   * @param {string} params.defaultValue
   *
   * @example formPage.checkbox({ name:"confirmation_emails", name:"Confirmation Emails"});
   */
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

  /**
   * Adds a custom dialog at the top of the display form that can be used
   * for interrupt-messaging.
   * @param {object} params
   * @param {string} params.title Alert box title
   * @param {string} params.text Alert box text
   * @param {string} params.linkText Action button link text
   * @param {string} params.linkHref URL of button
   * @example formPage.alert({
   *   title: "Connect",
   *   text: "Connect GitHub",
   *   linkText: "Connect",
   *   linkHref: "https://www.github.com"
   * })
   *
   */
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
  submitButton({ submitText, urlParams } = {}) {
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
   * const storedData = gopher.webhook.getExtensionData("mem", {});
   * formPage.populate(storedData);
   */
  populate(formData) {
    Object.assign(this.formData, formData);
  }
}

module.exports = SettingsPage;
