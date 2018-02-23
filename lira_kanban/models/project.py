# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
from odoo import models, fields


class Task(models.Model):
    _inherit = 'project.task'

    project_agile_method = fields.Selection(
        related="project_id.agile_method",
        string="Project agile method",
        lira=True,
    )
