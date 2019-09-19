# -*- coding: utf-8 -*-
# Copyright <2017> <Tenovar Ltd>
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
{
    'name': 'Project Scrum',
    'summary': 'Use Scrum Method to manage your project',
    'version': '10.0.1.0.1',
    'category': 'Project Management',
    'author': "Odoo Community Association (OCA)",
    'website': 'https://github.com/OCA/project-agile',
    'depends': [
        'base_setup',
        'project',
        'project_task_code',
        'project_stage_state',
        'mail',
    ],
    'data': [
        'views/mail_template.xml',
        'views/project_scrum_us.xml',
        'views/project_scrum_meeting.xml',
        'views/project_task.xml',
        'views/project_scrum_sprint.xml',
        'views/project_scrum_test.xml',
        'views/project_project.xml',
        'views/menu.xml',
        'data/sequences_projects.xml',
        'data/project_scrum_test_task_view.xml',
        'security/ir.model.access.csv',
        'security/project_security.xml',
        'security/res_groups.xml',
    ],
    'demo': ['demo/project_scrum_demo.xml'],
    'installable': True,
    'license': 'AGPL-3',
    'application': True,
}
