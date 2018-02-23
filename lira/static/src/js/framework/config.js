// Copyright 2017 - 2018 Modoolar <info@modoolar.com>
// License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

odoo.define('lira.config', function (require) {
    "use strict";
    var bus = require('lira.core').bus;

    var medias = [
        window.matchMedia('(max-width: 600px)'),
        window.matchMedia('(min-width: 601px) and (max-width: 992px)'),
        window.matchMedia('(min-width: 993px)')
    ];
    medias.forEach(m=>m.addListener(set_size_class));

    function size_class() {
        for (var i = 0; i < medias.length; i++) {
            if (medias[i].matches) {
                return i;
            }
        }
    }
    function set_size_class() {
        var sc = size_class();
        if (sc !== config.device.size_class) {
            config.device.size_class = sc;
            bus.trigger('size_class', sc);
        }
    }

    var config = {
        debug: ($.deparam($.param.querystring()).debug !== undefined),
        device: {
            //touch: 'ontouchstart' in window || 'onmsgesturechange' in window,
            size_class: size_class(),
            SIZES: {S: 0, M: 1, L: 2}
        }
    };

    return config;
});
