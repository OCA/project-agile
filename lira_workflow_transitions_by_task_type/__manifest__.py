# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

{
    "name": "Lira Workflow Transitions By Task Type",
    "summary": "Extend project workflow transitions with allowed task types",
    "category": "Project",
    "version": "11.0.1.0.0",
    "license": "LGPL-3",
    "author": "Modoolar, Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/web/",
    "depends": [
        "project_agile_workflow_transitions_by_task_type",
        "lira",
    ],
    "data": [
        "views/lira_workflow_transitions_by_task_type.xml",
    ],
    "installable": True,
}
