# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

{
    "name": "Project Agile Kanban",
    "summary": "This module enables you to manage your projects by using agile kanban methodology",
    "category": "Project",
    "version": "11.0.0.1.0",
    "license": "LGPL-3",
    "author": "Modoolar",
    "website": "https://www.modoolar.com/",

    "depends": [
        "project_agile",
        "project_agile_analytic"
    ],

    "data": [
        "views/project_agile_board_views.xml",
        "views/project_agile_kanban.xml",
        "wizards/board_create_wizard.xml",
    ],

    "demo": [],
    "qweb": [
        "static/src/xml/*.xml",
    ],
    "application": True,
    "post_init_hook": "post_init_hook",
}