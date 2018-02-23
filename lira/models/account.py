# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields


class AccountAnalyticLine(models.Model):
    _inherit = 'account.analytic.line'

    name = fields.Char(lira=True)
    date = fields.Date(lira=True)
    amount = fields.Monetary(lira=True)
    unit_amount = fields.Float(lira=True)
    user_id = fields.Many2one(lira=True)
