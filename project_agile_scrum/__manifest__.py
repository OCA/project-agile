# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

{
    "name": "Project Agile Scrum",
    "summary": "Manage your projects by using agile scrum methodology.",
    "category": "Project",
    "version": "11.0.1.0.0",
    "license": "LGPL-3",
    "author": "Modoolar, Odoo Community Association (OCA)",
    "website": "https://www.modoolar.com/",
    "depends": [
        "project_agile",
    ],

    "data": [
        'security/ir.model.access.csv',

        "views/project_agile_scrum_sprint_views.xml",
        "views/project_views.xml",
        "views/project_agile_team_views.xml",

        "views/menu.xml",
        "views/project_agile_board_views.xml",
    ],

    "demo": [],
    "qweb": [],
    "application": True,
    "post_init_hook": "post_init_hook",
}
