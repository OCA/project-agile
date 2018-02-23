# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

{
    "name": "Lira Kanban",
    "summary": "Manage your projects by using agile kanban methodology",
    "category": "Project",
    "version": "11.0.0.1.0",
    "license": "LGPL-3",
    "author": "Modoolar, Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/project-agile/",
    "depends": [
        "project_agile_kanban",
        "lira",
    ],

    "data": [
        "views/lira_kanban.xml",
    ],
    "qweb": [
        "static/src/xml/*.xml",
    ],
    "application": True,
}
