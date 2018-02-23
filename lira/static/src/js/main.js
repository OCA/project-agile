// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.main', function (require) {
    "use strict";
    var AgileLayout = require('lira.layout');
    var core = require('web.core');

    core.action_registry.add('lira', AgileLayout.AgileLayout);

});
