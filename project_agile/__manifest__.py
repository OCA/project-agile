# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
{
    "name": "Project Agile",
    "summary": "Framework for development of agile methodologies",
    "category": "Project",
    "version": "11.0.1.0.0",
    "license": "LGPL-3",
    "author": "Modoolar, Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/project-agile/",
    "depends": [
        "web",
        "project_key",
        "project_workflow",
        "hr_timesheet",
    ],

    "data": [
        # security
        "security/security.xml",
        "security/ir.model.access.csv",

        # wizards
        "wizards/board_export_wizard.xml",
        "wizards/board_import_wizard.xml",
        "wizards/board_create_wizard.xml",
        "wizards/project_task_worklog_wizard.xml",
        "wizards/add_subtask_wizard.xml",
        "wizards/add_task_link_wizard.xml",
        "wizards/stage_change_confirmation_wizard.xml",

        # views
        "views/project_project_views.xml",
        "views/project_task_views.xml",
        "views/project_workflow.xml",
        "views/project_agile_team_views.xml",
        "views/project_agile_board_views.xml",
        "views/project_agile.xml",

        # Menus
        "views/menu.xml",

        # data
        "data/project_task.xml",
        "data/project_project.xml",
    ],

    "qweb": ["static/src/xml/*.xml"],
    "post_init_hook": "post_init_hook",
    "application": False,
    "installable": True,
}
