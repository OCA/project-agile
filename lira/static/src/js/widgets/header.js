// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.header', function (require) {
    "use strict";
    var AgileBaseWidgets = require('lira.BaseWidgets');
    var AgileMenu = require('lira.menu');
    var data = require('lira.data');
    var bus = require('lira.core').bus;
    const HeaderWidget = AgileBaseWidgets.AgileBaseWidget.extend({
        template: "lira.layout.header",
        _name: "HeaderWidget",
        events: {
            "click .team-option": "_onTeamOptionClick"
        },
        willStart() {
            return $.when(this._super(), data.cache.get("current_user").then(user => {
                this.user = user;
            }));
        },
        renderElement() {
            this.data = data;
            this._super();
            this.menuTopWidget = new AgileMenu.AgileTopMenu(this, {viewKey: "page"});
            this.menuTopWidget.appendTo(this.$(".nav-middle"));
        },
        addedToDOM() {
            this._super();
            this.$('.notification-button').dropdown({
                inDuration: 300,
                outDuration: 225,
                constrain_width: false, // Does not change width of dropdown to that of the activator
                hover: true, // Activate on hover
                gutter: 0, // Spacing from edge
                belowOrigin: true, // Displays dropdown below the button
                alignment: 'left' // Displays dropdown with edge aligned to the left of button
            });
            this.$('.user-button').dropdown({
                inDuration: 300,
                outDuration: 225,
                constrain_width: false,
                hover: true,
                gutter: 0,
                belowOrigin: true,
                alignment: 'right'
            });
            this.$('.team-dropdown-button').closest(".dropdown-content").css("display", "block");
            let buttonWidth = this.$('.team-dropdown-button').outerWidth();
            // Fix for case when icon is not loaded at the moment of calculating width
            if ($('.team-dropdown-button').find("i.mdi").outerWidth() === 0) {
                buttonWidth += 20;
            }
            this.$('.team-dropdown-button').closest(".dropdown-content").css("display", "");
            this.$('.team-dropdown-button').dropdown({
                inDuration: 300,
                outDuration: 225,
                constrain_width: false,
                hover: true,
                gutter: buttonWidth,
                belowOrigin: false,
                alignment: 'right'
            });

        },
        start() {
            bus.on("search:show", this, (keydownEvent, callback) => {
                this.$(".nav-wrapper").addClass("with-search");
                $(".nav-search > div").show();
                let searchInput = $(".nav-search input");
                searchInput.keydown(function (evt) {
                    clearTimeout(this.searchDelayTimeout);
                    if (evt.keyCode == 13) {
                        keydownEvent($(this));
                    } else {
                        this.searchDelayTimeout = setTimeout(() => {
                            keydownEvent($(this));
                        }, 1000);
                    }
                });
                if (typeof callback == "function") {
                    callback(searchInput);
                }
            });
            bus.on("search:remove", this, () => {
                this.$(".nav-wrapper").removeClass("with-search");
                this.$(".nav-search > div").hide();
                this.$(".nav-search input").off();
            });
            this.$(".search-button").click(() => {
                this.$(".nav-wrapper").toggleClass("search-open");
            });
            this.$(".back-to-odoo").click(e => {
                e.preventDefault();
                let href = "/web";
                href += data.session.debug ? "?debug=" + data.session.debug : "";
                window.location.href = href;
            });
            return this._super();
        },
        _onTeamOptionClick(e) {
            let team_id = $(e.currentTarget).getDataFromAncestor("id");
            let team = this.user.team_ids[team_id];
            if (this.user.team_id[0] !== team.id) {
                this.user.team_id[0] = team.id;
                this.$(".team-name").html(team.name);
                hash_service.delete("view");
                hash_service.setHash("page", "dashboard", true, true);
                hash_service.delete("project");

                data.getDataSet("res.users").call('change_team', [[data.session.uid], team.id]).then(() => {
                    bus.trigger("team:changed", team.id);
                })
            }
        },
    });
    return {
        HeaderWidget
    }
});
