
from odoo import api, fields, models, _


class ProjectTask (models.Model):

    _inherit = 'project.task'

    is_user_storie = fields.Boolean(string='Is history user', help=_('Mark if this taks is a user history'))
    scrum_complexity = fields.Integer(string='Complexity', help=_('Score the complexity of the task'))
    scrum_what = fields.Text(string='What to do?')
    scrum_who = fields.Text(string='For whom?')
    scrum_for_what = fields.Text(string='For What?')
    # scrum_detail = fields.Html(string='Detail', help=_('Write a description of the task'))
    scrum_priority = fields.Selection(string='Task priority', selection=[('0', 'Normal'), ('1', 'Baja'),('2', 'Alta'),('3', 'Muy Alta')])
    
    
