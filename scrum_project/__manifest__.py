# SDI
# © 2019 Jorge Luis Quinteros <jquinteros@sdi.es>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
{
    'name':'SDi SCRUM Project',
    'version': '11.0.1.0.0',
    'category': 'Project Agile',
    'author': 'Jorge Luis Quinteros',
    'summary': """  
        Create SCRUM environment""",
    'license': 'AGPL-3',
    'depends':[
        'project',
        'contacts',         
    ],
    'data':[
        'views/inherit_project_task_form_view.xml',
        'views/scrum_team_view.xml',
    ],
    'installable':True,
}
