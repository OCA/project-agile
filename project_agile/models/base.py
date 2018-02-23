# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, fields, exceptions, api, _


class AgileSystemCodeItem(models.AbstractModel):
    _name = 'project.agile.code_item'
    _inherit = ['project.agile.mixin.id_search']
    _description = 'Agile Code Item'
    _order = 'sequence'

    name = fields.Char(
        string="Name",
        required=True,
    )

    description = fields.Html(
        string="Description",
        required=False,
    )

    system = fields.Boolean(
        string='Is System Type',
        readonly=True,
        default=False,
    )

    active = fields.Boolean(
        string='Active',
        default=True,
    )

    sequence = fields.Integer(
        string='Sequence',
        default=10,
    )

    @api.multi
    def unlink(self):
        for item in self:
            if item.system:
                raise exceptions.ValidationError(_(
                    "%s '%s' is a system record!\n"
                    "You are not allowed to delete system record"
                ) % (self._description or self._name, item.name_get()[0][1]))
        return super(AgileSystemCodeItem, self).unlink()
