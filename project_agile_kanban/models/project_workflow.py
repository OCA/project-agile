# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import models, api


class WorkflowState(models.Model):
    _inherit = 'project.workflow.state'

    @api.model
    def name_search(self, name, args=None, operator='ilike', limit=100):
        if args is None:
            args = []
        if 'filter_states' in self.env.context:
            args.append(('id', 'in', [
                x[1] for x in self.env.context.get('filter_states', [])
            ]))
        return super(WorkflowState, self).name_search(
            name, args=args, operator=operator, limit=limit
        )
