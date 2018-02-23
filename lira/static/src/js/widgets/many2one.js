// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.widget.many2one', require => {
    "use strict";
    const data = require('lira.data');
    const BaseWidgets = require('lira.BaseWidgets');
    let Many2One = BaseWidgets.AgileBaseWidget.extend({
        template: "lira.widget.many2one",
        limit: 8,
        init(parent, options) {
            Object.assign(this, options);
            this._super(parent, options);
            this._require_prop("model");
            this.selectionIndex = 0;
            this.isDirty = false;
        },
        renderElement() {
            this._super();
            if (this.default) {
                $.when(this.default).then(def => {
                        if (def) {
                            if (!def.name || !def.id) {
                                throw new Error("If default value is passed it has to contain 'id' and 'name' properties.");
                            }
                            this.$("input.name").val(def.name);
                            this.$("input.id").val(def.id);
                        }
                    }
                );
            }
            this.$("input.id").attr("data-error", ".err-" + this.field_name);
            $('<div class="err-' + this.field_name + '"></div>').insertAfter(this.$(".m2o-wrapper"));
            this.setReadonly(this.readonly);
        },
        addedToDOM() {
            Materialize.updateTextFields();
        },
        start() {
            this.$("input.id").change(this.changeHandler.bind(this));

            this.$("input.name").on('keyup', e => {
                // Capture Enter
                if (e.which === 13) {
                    this.$el.find(`li:nth-child(${this.selectionIndex})`).click();
                    return;
                }
                // Capture Up
                if (e.which === 38) {
                    this.selectSuggestion(-1);
                    return;
                }
                // Capture Down
                if (e.which === 40) {
                    this.selectSuggestion(1);
                    return;
                }
                this.$(".many2one-content").empty();
                this.isDirty = true;
                this.searchSuggestions();
            }).on('focusin', e => {
                this.searchSuggestions();
            }).on('focusout', e => {
                if (e.relatedTarget && this.$el.has(e.relatedTarget).length === 0) {
                    this.$(".many2one-content").empty();
                }
            });
        },
        selectSuggestion(positionOffset) {
            if (positionOffset) {
                this.selectionIndex = (this.selectionIndex - 1 + positionOffset + this.suggestions.length) % this.suggestions.length + 1;
            } else {
                this.selectionIndex = 0;
            }
            this.$el.find('li').removeClass("selected");
            this.$el.find(`li:nth-child(${this.selectionIndex})`).addClass("selected");
        },
        searchSuggestions() {
            let val = this.isDirty ? this.$("input.name").val() : "";
            data.getDataSet(this.model).name_search(val, this.domain, this.operator, this.limit).then(values => {
                let suggestions = values.map(e => {
                    return {
                        id: e[0], name: e[1]
                    }
                });
                this.renderSuggestions(suggestions);
            });
        },
        renderSuggestions(suggestions) {
            if (suggestions) {
                this.suggestions = suggestions;
            }
            let root = this.$(".many2one-content");
            root.empty();
            for (let suggestion of this.suggestions) {
                let suggestionNode = this.renderSuggestion(suggestion);
                suggestionNode.click(this.suggestionClickHandler.bind(this));
                suggestions = root.append(suggestionNode);
            }
        },
        renderSuggestion(suggestion) {
            return $(`<li data-id="${suggestion.id}"><span>${suggestion.name}</span></li>`);
        },
        changeHandler() {
        },
        suggestionClickHandler(e) {
            let itemNode = $(e.target);

            this.$("input.name").val(itemNode.text().trim());
            this.$("input.id").val(itemNode.getDataFromAncestor("id"));
            this.$("input").trigger('change');
            this.$(".many2one-content").empty();

            // If many2one widget is inside form that's being validated by jquery.validate, trigger valid() on input.id
            if (this.$el.getDataFromAncestor("validator")) {
                this.$("input.id").valid();
            }
        },
        setReadonly(state) {
            this.$("input").attr("readonly", !!state);
        }
    });
    return {
        Many2One
    }
});
