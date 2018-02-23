# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
from odoo import models


class AddSubTaskWizard(models.TransientModel):
    _inherit = 'project.sub_task.add_wizard'

    def _populate_sub_task(self):
        sub_task_values = super(AddSubTaskWizard, self)._populate_sub_task()
        story_type = self.env.ref("project_agile.project_task_type_story")
        if self.task_id.type_id.id == story_type.id:
            sprint_id = self.task_id.sprint_id
            sub_task_values.update({
                'sprint_id': sprint_id and sprint_id.id or False
            })

        return sub_task_values
