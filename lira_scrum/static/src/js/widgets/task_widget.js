// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.widget.task.scrum_extension', function (require) {
    "use strict";

    var TaskWidget = require('lira.widget.task').TaskWidget;


    TaskWidget.include({
        renderElement() {
            this._super();
            if(this._model.sprint_ids.length > 1){
                DataServiceFactory.get("project.agile.scrum.sprint").getRecords(this._model.sprint_ids).then(sprints=>{
                    let sprintContainer = this.$("[data-field='sprint_ids']");
                    for (let sprint of sprints) {
                        sprintContainer.append($(`<span class="agile-tag">${sprint.name}</span>`))
                    }
                    this.$("[data-field-name='sprint_ids']").show();
                })
            }
        }
    });

});
