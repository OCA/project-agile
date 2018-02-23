# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
from odoo import models, fields


class Task(models.Model):
    _inherit = 'project.task'

    sprint_id = fields.Many2one(
        comodel_name="project.agile.scrum.sprint",
        lira=True
    )

    sprint_ids = fields.Many2many(
        comodel_name="project.agile.scrum.sprint",
        lira=True
    )
