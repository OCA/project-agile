from odoo import api, fields, models, _

class ScrumSprint (models.Model):
    _name = 'sprint'

    sprint_name = fields.Char(string='Sprint name')
    sprint_init = fields.Date(string='Sprint Start')
    sprint_end = fields.Date(string='Sprint End')
    
    
    