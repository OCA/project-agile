# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
from odoo import models, fields


class AgileTeam(models.Model):
    _inherit = 'project.agile.team'

    type = fields.Selection(
        selection_add=[('kanban', 'Kanban')],
    )
