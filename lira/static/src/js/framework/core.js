// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.core', function (require) {
    "use strict";
    var Bus = require('web.Bus');

    var bus = new Bus();

    return {
        bus,
    }
});
