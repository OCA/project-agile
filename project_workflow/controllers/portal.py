# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo.http import request
from odoo.addons.project_portal.controllers.portal import CustomerPortal


class CustomerPortal(CustomerPortal):

    def portal_my_task_prepare_values(self, task_id=None, **kw):
        values = super(CustomerPortal, self)\
            .portal_my_task_prepare_values(task_id, **kw)

        task = request.env['project.task'].browse(task_id)

        available_transitions = task.project_id.workflow_id.find_transitions(
            task, task.stage_id.id
        )
        values['transitions'] = available_transitions
        return values
