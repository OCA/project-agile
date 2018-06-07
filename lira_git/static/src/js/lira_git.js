// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define("lira_git", function (require) {

    const TaskWidget = require('lira.widget.task').TaskWidget;
    const ModalWidget = require('lira.widget.modal').ModalWidget;
    const session = require('web.session');

    TaskWidget.include({
        start() {
            $("#show_commits").click(() => {
                session.rpc(`/lira/git/${this.id}/commits`).then(commits => {
                    var modal = new CommitsModal(this, {commits});
                    modal.appendTo($("body"));
                });

            });

            return this._super();
        }
    });


    const CommitsModal = ModalWidget.extend({
        template: "lira.widget.modal.show_commits",
        init(parent, options) {
            this._super(parent, options);
            this._require_prop("commits");
        },
        addedToDOM() {
            this._super();
            this.$('.tooltipped').tooltip();
        }
    });

    return {
        CommitsModal
    }
});
