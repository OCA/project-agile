// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile.layout', function (require) {
    "use strict";

    var core = require('project_agile.core');
    var _t = require('web.core')._t;
    var data = require('project_agile.data');
    var web_client = require('web.web_client');
    var PageManager = require('project_agile.page_manager');

    var AgileContainerWidget = require('project_agile.BaseWidgets').AgileContainerWidget;
    var AgileHeader = require('project_agile.header');

    var AgileLayout = AgileContainerWidget.extend({
        template: "project.agile.layout",
        failTemplate: "project.agile.layout.fail",
        custom_events: {
            'menu.added': function () {
                if (this._is_added_to_DOM.state() === "resolved") {
                    this.$el.addClass("with-menu");
                } else {
                    this.className = this.className ? this.className.concat(" with-menu") : "with-menu";
                }
            },
            'menu.removed': function () {
                if (this._is_added_to_DOM.state() === "resolved") {
                    this.$el.removeClass("with-menu");
                }
            },
        },
        _name: "layout",
        init(parent, options) {
            this._super(parent, options);
            web_client.loading.destroy();
            core.layout = this;
        },
        build_widget_list() {
            this.add_widget({
                'id': 'header_widget',
                'widget': AgileHeader.HeaderWidget,
                'replace': 'widget.header',
            });
            this.add_widget({
                'id': 'page_manager_widget',
                'widget': PageManager,
                'replace': 'widget.page_manager',
                'args': {
                    defaultView: "dashboard",
                    _name: 'page_manager_widget'
                }
            });
        },
        willStart() {
            return $.when(this._super(), data.cache.get("current_user").then(user => {
                this.user = user;
            }))
        },
        renderElement() {
            // If user has no team, then he's not allowed to enter agile app.
            if (!this.shouldLoad()) {
                let $el = $(qweb.render(this.failTemplate, this.generateLoadingErrors()).trim());
                this.replaceElement($el);
                return;
            }
            return this._super();
        },
        shouldLoad() {
            return this.user.team_id;
        },
        generateLoadingErrors() {
            let errors = [
                {
                    name: "no_agile_team",
                    title: _t("Agile team missing"),
                    message: _t("You don't belong to any agile team, please contact your Administrator.")
                }
            ];
            return {
                errors
            }
        },
        start() {
            // Remove
            //$(document).off('click keyup',null,$._data(document,"events").keyup[1].handler);

            var appNode = document.getElementsByClassName("o_content")[0];
            var self = this;
            var observer = new MutationObserver(mutations => {
                mutations.forEach(function (mutation) {
                    if (mutation.addedNodes[0].id == "agile_layout" || mutation.addedNodes[0].id == "agile_layout_fail") {
                        self.actionAddedToDOM();
                        observer.disconnect();
                    }
                });
            });
            observer.observe(appNode, {childList: true});
            return this._super();
        },
        actionAddedToDOM() {
            this.__is_added_to_DOM.resolve();
            this.$el.addClass(this.className);
            this.materializeInit();
        },
        materializeInit() {
            $('body').addClass('loaded');
            Waves.init({
                duration: 500,
                delay: 1000
            });
        },
    });
    return {
        AgileLayout
    };

});