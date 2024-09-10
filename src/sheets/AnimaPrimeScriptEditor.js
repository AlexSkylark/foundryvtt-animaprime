export default class AnimaPrimeScriptEditor extends FormApplication {
    constructor() {
      super(...arguments);
      this._advancedEditor = null;
    }

    static get defaultOptions() {
      return {
        ...super.defaultOptions,
        title: 'Item Script editor',
        classes: [`script-editor-window`],
        resizable: false,
        closeOnSubmit: true,
        submitOnClose: true,
        template: '/systems/animaprime/templates/sheets/item/item-script-editor/item-script-editor.hbs',
        width: 700,
        height: 700
      };
    }

    _getTarget() {
      return this?.object?.target;
    }

    // eslint-disable-next-line no-unused-vars
    async getData(options) {
      return {
        value: this._getTarget()?.val(),
      };
    }

    _getSubmitData(...args) {
      if (this._advancedEditor) { this._advancedEditor.save(); }
      this.object.target[0].dispatchEvent(new CustomEvent("change", { detail: { scriptValue: $(".item-script-editor").val() } }));
      return super._getSubmitData(...args);
    }

    async _updateObject(event, formData) {
      const stringData = formData.value;
      this._getTarget()?.val(stringData);
    }

    activateListeners($html) {
      super.activateListeners($html);
      const $advancedEditor = $html.find('.item-script-editor');
      if (!$advancedEditor || !$advancedEditor[0]) { return; }
      $advancedEditor.val(this._getTarget()?.val());
      this._advancedEditor = CodeMirror.fromTextArea($advancedEditor[0], {
        ...CodeMirror.userSettings,
        mode: 'javascript',
        inputStyle: 'contenteditable',
        lineNumbers: true,
        autofocus: true,
      });
    }
  }