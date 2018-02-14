# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields


class AgileReport(models.AbstractModel):
    _inherit = 'project.agile.report'

    type = fields.Selection(
        selection_add=[('scrum', 'Scrum')],
    )
