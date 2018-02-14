// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('project_agile.header', function (require) {
    "use strict";
    var AgileBaseWidgets = require('project_agile.BaseWidgets');
    var AgileMenu = require('project_agile.menu');
    var data = require('project_agile.data');
    var bus = require('project_agile.core').bus;
    const HeaderWidget = AgileBaseWidgets.AgileBaseWidget.extend({
        template: "project.agile.layout.header",
        _name: "HeaderWidget",
        init(parent, options) {
            this._super(parent, options);
            this.menuTopWidget = new AgileMenu.AgileTopMenu(this, {viewKey: "page"});
        },
        renderElement() {
            this._super();
            data.cache.get("current_user").then(user => {
                this.user = user;
                this.$(".user-name").html(user.name);
                let team = user.team_id[1];
                this.$(".team-name").html(team);
                if (Object.keys(user.team_ids).length > 1) {
                    let teamList = this.$("#team-dropdown");
                    for (let team_id in user.team_ids) {
                        let team = user.team_ids[team_id];
                        let teamLi = $("<li><a data-id='" + team.id + "'><img class='circle team-image' src='" + data.getImage("project.agile.team", team_id) + "'/> " + team.name + "</a></div></li>");
                        teamList.append(teamLi);
                        teamLi.click(() => {
                            if (user.team_id[0] !== team.id) {
                                user.team_id[0] = team.id;
                                this.$(".team-name").html(team.name);
                                let newProject = user.team_ids[team.id].project_ids.length ? user.team_ids[team.id].project_ids[0] : false;
                                let teamChangeDef = $.Deferred();
                                hash_service.delete("view");
                                hash_service.setHash("page", "dashboard");
                                hash_service.delete("project");
                                bus.trigger("team:changed", team.id, teamChangeDef);

                                data.getDataSet("res.users").call('change_team', [[data.session.uid], team.id]).then(() => {
                                    console.log("changed team context:", team.id);
                                    teamChangeDef.resolve();
                                })
                            }
                        })
                    }
                } else {
                    this.$(".team-dropdown-button").hide();
                }
                this.$(".user-button").show();
            });
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
        }
    });
    return {
        HeaderWidget
    }
});