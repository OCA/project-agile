# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

{
    "name": "Project Key",
    "summary": "This module decorates project task with ``key`` index per project ",
    "category": "Project",
    "version": "11.0.1.0.0",
    "license": "LGPL-3",
    "author": "Modoolar",
    "website": "https://www.modoolar.com/",
    "depends": [
        "project",
    ],
    "data": [
        "views/project_key_views.xml",
        "views/project_portal_templates.xml"
    ],

    "demo": [],
    "qweb": [

    ],
    "application": False,
    "post_init_hook": "post_init_hook",
}