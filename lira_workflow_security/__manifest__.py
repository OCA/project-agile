# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

{
    "name": "Lira Workflow Security",
    "summary": "This module extends workflow transitions with security groups",
    "category": "Project",
    "version": "11.0.1.0.0",
    "license": "LGPL-3",
    "author": "Modoolar, Odoo Community Association (OCA)",
    "website": "https://www.modoolar.com/",
    "depends": [
        "project_workflow_security",
        "lira",
    ],

    "data": [
        "views/lira_workflow_security.xml",
    ],
    "images": [],
    "installable": True,
}
