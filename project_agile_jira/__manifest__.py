# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

{
    "name": "Project Agile Jira Extension",
    "summary": "This module enables you to migrate your projects and tasks from JIRA to Odoo",
    "category": "Project",
    "version": "11.0.1.0.0",
    "license": "LGPL-3",
    "author": "Modoolar",
    "website": "https://www.modoolar.com/",
    "depends": [
        "project_agile",
    ],

    'external_dependencies': {
        'python': ['jira'],
    },

    "data": [
        "security/ir.model.access.csv",

        "data/sequences.xml",
        "data/crons.xml",

        "wizards/task_import_view.xml",

        "views/jira_request_views.xml",
        "views/jira_config_views.xml"
    ],
    "application": True,
}