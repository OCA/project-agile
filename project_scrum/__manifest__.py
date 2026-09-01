# Copyright <2017> <Tenovar Ltd>
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
{
    "name": "Project Scrum",
    "summary": "Use Scrum Method to manage your project",
    "version": "16.0.1.0.0",
    "category": "Project Management",
    "author": "Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/project-agile",
    "depends": [
        "base_setup",
        "project",
        "project_task_code",
        "project_task_stage_state",
        "mail",
        "hr_timesheet",
    ],
    "data": [
        "views/project_task.xml",
        "views/project_scrum_sprint.xml",
        "views/project_project.xml",
        "views/menu.xml",
        "data/sequences_projects.xml",
        "security/ir.model.access.csv",
        "security/project_security.xml",
    ],
    "demo": ["demo/project_scrum_demo.xml"],
    "installable": True,
    "license": "AGPL-3",
    "application": True,
}
