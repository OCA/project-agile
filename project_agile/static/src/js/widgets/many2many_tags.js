// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile.widget.many2many_tags', require => {
    "use strict";
    const data = require('project_agile.data');
    const BaseWidgets = require('project_agile.BaseWidgets');
    let Many2ManyTags = BaseWidgets.AgileBaseWidget.extend({
        className: "chips chips-autocomplete input-field",
        limit: 5,
        init(parent, options) {
            Object.assign(this, options);
            this._super(parent, options);
            if (this.res_id) {
                this._require_prop("model");
                if (!Array.isArray((this.res_ids))) {
                    this._require_prop("field_name", "Since res_ids is not specified, field_name must be set in order to be fetched");
                }
            }
            this._require_prop("comodel");
            this.tags = {};
        },
        willStart() {
            return this._super().then(() => {
                // If res_ids is set, use it for initial tags
                if (Array.isArray(this.res_ids)) {
                    if (this.res_ids.length === 0) {
                        return;
                    }
                    return this.fetchTags();
                }
                if (!this.res_id) {
                    return;
                }
                return data.getDataSet(this.model).read_ids([this.res_id], [this.field_name]).then(result => {
                    this.res_ids = result[0][this.field_name];
                    return this.fetchTags();
                });
            })
        },
        fetchTags() {
            return data.getDataSet(this.comodel).read_ids(this.res_ids, ["name"]).then(result => {
                this.tags = {};
                result.forEach(tag => this.tags[tag.id] = tag);
                return this.tags;
            });
        },
        val() {
            return this._getIds();
        },
        _getIds() {
            return Object.keys(this.tags);
        },
        beforeAddHook(elem) {
            if (!elem.id) {
                delete elem.id;
                return data.getDataSet(this.comodel).create(elem).then(id => {
                    elem.id = id;
                    return elem;
                });
            }
            return $.when();
        },
        tagAdded(e, chip) {
            this.tags[chip.id] = chip
        },
        beforeDeleteHook(elem) {
            return $.when();
        },
        tagDeleted(e, chip) {
            return delete this.tags[chip.id];
        },
        addedToDOM() {
            let materialChipOptions = {
                data: this.tags,
                placeholder: 'Enter a tag',
                secondaryPlaceholder: '+Tag',
                beforeDeleteHook: this.beforeDeleteHook.bind(this),
                beforeAddHook: this.beforeAddHook.bind(this),
                autocompleteOptions: {
                    customData: val => data.getDataSet(this.comodel).name_search(val, [["id", "not in", this._getIds()]], undefined, this.limit).then(result => {
                        this.suggested_tags = {};
                        result.forEach(el => this.suggested_tags[el[0]] = {id: el[0], name: el[1]});
                        return this.suggested_tags;
                    })
                }
            }
            this.$el.new_material_chip(materialChipOptions);
            this.$el.on('chip.add', this.tagAdded.bind(this));
            this.$el.on('chip.delete', this.tagDeleted.bind(this));
        },
        // selectSuggestion(positionOffset) {
        //     if (positionOffset) {
        //         this.selectionIndex = (this.selectionIndex - 1 + positionOffset + this.suggestions.length) % this.suggestions.length + 1;
        //     } else {
        //         this.selectionIndex = 0;
        //     }
        //     this.$el.find('li').removeClass("selected");
        //     this.$el.find(`li:nth-child(${this.selectionIndex})`).addClass("selected");
        // },
        // searchSuggestions() {
        //     let val = this.$("input.name").val();
        //     data.getDataSet(this.model).name_search(val, this.domain, this.operator, this.limit).then(values => {
        //         let suggestions = values.map(e => {
        //             return {
        //                 id: e[0], name: e[1]
        //             }
        //         });
        //         this.renderSuggestions(suggestions);
        //     });
        // },
        // renderSuggestions(suggestions) {
        //     if (suggestions) {
        //         this.suggestions = suggestions;
        //     }
        //     let root = this.$(".many2one-content");
        //     root.empty();
        //     for (let suggestion of this.suggestions) {
        //         let suggestionNode = this.renderSuggestion(suggestion);
        //         suggestionNode.click(this.suggestionClickHandler.bind(this));
        //         suggestions = root.append(suggestionNode);
        //     }
        // },
        // renderSuggestion(suggestion) {
        //     return $(`<li data-id="${suggestion.id}"><span>${suggestion.name}</span></li>`);
        // },
        // setReadonly(state) {
        //     this.$("input").attr("readonly", !!state);
        // }
    });
    return {
        Many2ManyTags
    }
});