# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields


class AgileReport(models.AbstractModel):
    _name = 'project.agile.report'

    name = fields.Char(required=True)
    description = fields.Html(required=True)
    type = fields.Selection(selection=[], string="Type", required=True)
    image_url = fields.Char(required=True)
    action_id = fields.Many2one(
        comodel_name='ir.actions.client',
        required=True
    )


class AgileTeamReport(models.Model):
    _name = 'project.agile.team.report'
    _inherit = 'project.agile.report'


class AgileBoardReport(models.Model):
    _name = 'project.agile.board.report'
    _inherit = 'project.agile.report'
