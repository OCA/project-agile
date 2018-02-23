# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

{
    "name": "Lira Git",
    "summary": "Enables you to integrate project_git with Lira",
    "category": "Project",
    "version": "11.0.1.0.0",
    "license": "LGPL-3",
    "author": "Modoolar, Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/project-agile/",
    "depends": [
        "project_git",
        "lira"
    ],
    "data": [
        "views/lira_git.xml"
    ],
    "qweb": [
        "static/src/xml/lira_git.xml",
    ],
    "application": False
}
