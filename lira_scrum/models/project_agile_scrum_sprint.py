# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api, exceptions, _


class Sprint(models.Model):
    _inherit = ['project.agile.scrum.sprint']
    _implements_syncer = True

    name = fields.Char(lira=True)
    description = fields.Html(lira=True)
    start_date = fields.Datetime(lira=True)
    end_date = fields.Datetime(lira=True)
    actual_end_date = fields.Datetime(lira=True)
    total_story_points = fields.Integer(lira=True)
    state = fields.Selection(lira=True)
    velocity = fields.Integer(lira=True)
    task_count = fields.Integer(lira=True)
    order = fields.Float(lira=True)
    active = fields.Boolean(lira=True)
    task_ids = fields.One2many(
        comodel_name="project.task",
        lira=True
    )
    team_id = fields.Many2one(
        comodel_name='project.agile.team',
        lira=True
    )

    @api.multi
    def open_in_lira(self):
        self.ensure_one()

        if self.state == 'completed':
            raise exceptions.ValidationError(_(
                "Only future or active sprint can be opened in Lira!"
            ))

        view_type = 'sprint' if self.state == 'active' else 'backlog'

        return {
            'type': 'ir.actions.act_url',
            'target': 'self',
            'url': "/lira/web#page=board&view=%s" % view_type
        }
