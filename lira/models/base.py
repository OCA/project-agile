# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, api


class Base(models.AbstractModel):
    _inherit = 'base'

    @api.model
    def _format_values(self, record, vals, update_related_fields=False):
        res = super(Base, self)._format_values(
            record, vals, update_related_fields
        )

        for fn in list(res.keys()):
            if not record._fields[fn]._attrs.get('lira', False):
                del res[fn]
        return res


class AgileSystemCodeItem(models.AbstractModel):
    _inherit = 'project.agile.code_item'

    name = fields.Char(lira=True)
    description = fields.Html(lira=True)
    system = fields.Boolean(lira=True)
    active = fields.Boolean(lira=True)
    sequence = fields.Integer(lira=True)
    lira_icon = fields.Char(string='Lira Icon')
    lira_icon_color = fields.Char(string='Lira Icon Color')
