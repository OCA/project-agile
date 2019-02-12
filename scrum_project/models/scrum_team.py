from odoo import api, fields, models, _

class ScrumTeam (models.Model):
    _name = 'scrum.team'

    scrum_team_name = fields.Char(string='Name SCRUM team', required='True')
    scrum_team_users = fields.Many2many(comodel_name='res.partner', string='Team components', domain="[('company_type', '=', 'Individual')]")
    
    