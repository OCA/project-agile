# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

{
    "name": "Project Agile Git",
    "summary": """This module enables you to integrate project_git with project_agile""",
    "category": "Project",
    "version": "11.0.1.0.0",
    "license": "LGPL-3",
    "author": "Modoolar",
    "website": "https://www.modoolar.com/",
    "depends": [
        "project_agile",
        "project_git"
    ],
    "data": [
        "views/project_agile_git.xml"
    ],

    "demo": [],
    "qweb": [
        "static/src/xml/project_agile_git.xml",
    ],
    "application": False
}