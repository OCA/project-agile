"use strict";
// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).


odoo.define('project_agile.toast', function (require) {
    var web_core = require('web.core');
    var _t = web_core._t;

    return {
        duration: 5000,
        /**
         *
         * @param {(string | jQuery)} content
         * @param {string} imageUrl
         * @param {number} duration - Duration in milliseconds
         * @param {Object} button - Object with button metadata
         * @param {string} button.text - Button name
         * @param {function} button.callback - Callback that will be called on button click
         * @param {function} callback - Callback that will be called when toast is completed
         * @param {string} type - Class that will be appended to toast, can be used for customising style
         */
        toast(content, imageUrl, button, callback = undefined, duration = this.duration, type = "") {
            var toastContainer = $("<div class='toast-container'/>");

            if (imageUrl) {
                var toastUserImage = $('<div class="toast-left"><img alt="" class="user-image circle" src="' + imageUrl + '"></div>');
                toastContainer.append(toastUserImage);
            }

            var toastContent = $('<div class="toast-content"></div>');
            toastContent.append(content);
            toastContainer.append(toastContent);
            if (button) {
                let btn = $('<div class="toast-right"><button class="btn-flat toast-action white-text">' + button.text + '</button></div>');
                btn.click(button.callback);
                toastContainer.append(btn);
            }
            Materialize.toast(toastContainer, duration, ("agile-toast" + " " + type).trim(), callback);
        },
        toastTask(user, task, method) {
            let action = {
                create: _t("created"),
                write: _t("updated"),
                unlink: _t("deleted"),
            };
            var toastContent = $('<div class="toast-content"><p><span class="toast-user-name">' + user.name + '</span> ' + action[method] + ' ' + task.priority_id[1] + ' ' + task.type_id[1] + ' <span class="toast-task-name">' + task.key + ' - ' + task.name + '</span></p></div>');
            this.toast(toastContent, data.getImage("res.users", user.id, user.write_date), {
                text: "open", callback: () => {
                    hash_service.set("task", task.id);
                    hash_service.set("view", "task");
                    hash_service.set("page", "board");
                }
            });
        }
    }
});
