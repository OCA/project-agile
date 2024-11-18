# © 2024 TechnoLibre (http://www.technolibre.ca)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Project Scrum Epic",
    "summary": "Use context Epic with Scrum Method to manage your project",
    "version": "14.0.1.0.0",
    "category": "Project Management",
    "author": "Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/project-agile",
    "depends": [
        "project_scrum",
    ],
    "data": [
        "views/project_scrum_epic.xml",
        "views/project_task.xml",
        "views/project_project.xml",
        "views/menu.xml",
        "data/sequences_projects.xml",
        "security/ir.model.access.csv",
    ],
    "installable": True,
    "license": "AGPL-3",
    "application": False,
}
