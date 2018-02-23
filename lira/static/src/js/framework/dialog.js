// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

'use strict';
odoo.define('lira.dialog', function (require) {
    return {
        /**
         *
         * @param {string} title
         * @param {string} message
         * @param {string} [okText=ok] - Positive button text
         * @param {string} [cancelText=cancel] - Negative button text
         */
        confirm(title, message, okText = "ok", cancelText = "cancel") {
            let def = new $.Deferred();
            let modal = $("<div id='" + Date.now() + "' class='modal dialog'>" +
                "<div class='modal-content'><h4>" + title + "</h4><p>" + message + "</p></div>" +
                "</div>");
            let modalFooter = $("<div class='modal-footer'></div>");
            modalFooter.appendTo(modal);
            let ok = $("<a class='modal-action waves-effect waves-green btn-flat'>" + okText + "</a>");
            let cancel = $("<a class='modal-action modal-close waves-effect waves-green btn-flat'>" + cancelText + "</a>");
            modalFooter.append(ok).append(cancel);
            $("body").append(modal);
            modal.materialModal({
                dismissible: false,
                complete: function () {
                    if (!modal.ok) {
                        def.reject();
                    }
                    modal.remove();
                }
            });

            modal.materialModal("open");
            ok.click(() => {
                modal.ok = true;
                def.resolve();
                modal.materialModal("close")
            });
            return def.promise();

        }
    }
});
