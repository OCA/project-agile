# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api


class AgileTeam(models.Model):
    _inherit = 'project.agile.team'

    name = fields.Char(lira=True)
    description = fields.Html(lira=True)
    type = fields.Selection(lira=True)
    email = fields.Char(lira=True)
    default_hrs = fields.Float(lira=True)
    member_ids = fields.Many2many(
        comodel_name='res.users',
        lira=True
    )
    project_ids = fields.Many2many(
        comodel_name='project.project',
        lira=True
    )
    product_owner_ids = fields.One2many(
        comodel_name='res.users',
        lira=True
    )
    workflow_id = fields.Many2one(
        comodel_name='project.workflow',
        lira=True
    )

    @api.multi
    def open_in_lira(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_url',
            'target': 'self',
            'url': "/lira/web"
        }
