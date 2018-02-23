# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

{
    "name": "Project Agile Kanban",
    "summary": "Manage your projects by using agile kanban methodology",
    "category": "Project",
    "version": "11.0.0.1.0",
    "license": "LGPL-3",
    "author": "Modoolar, Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/project-agile/",
    "depends": [
        "project_agile",
        "project_agile_analytic"
    ],

    "data": [
        "security/ir.model.access.csv",
        "views/project_agile_board_views.xml",
    ],
    "application": True,
    "post_init_hook": "post_init_hook",
}
