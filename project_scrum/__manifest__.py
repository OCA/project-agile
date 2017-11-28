# -*- coding: utf-8 -*-
# Copyright <2017> <Tenovar Ltd>
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
{
    'name': 'Project Scrum',
    'summary': 'Use Scrum Method  to manager your project',
    'version': '10.0.1.0.0',
    'category': 'Project Management',
    'author': "Mohamed Habib Challouf,Samir Guesmi,Odoo Community Association (OCA)",
    'website': 'https://github.com/OCA/project-agile',
    'depends': [ 'base_setup',
                 'project',
                 'mail',
                 'hr_timesheet',
                 'web_kanban',
                 'web_planner',
                 'web_tour', ],
    'data': ['project_scrum_view.xml',
              'sequences_projects.xml',
              'wizard/project_scrum_test_task_view.xml',
              'security/ir.model.access.csv',
              'security/project_security.xml',
       ],
   
     'qweb': ['static/src/xml/project_scrum.xml'],
     'demo': ['demo/project_scrum_demo.xml'],
     'installable': True,
     'license': 'AGPL-3',
}

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
