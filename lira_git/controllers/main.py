# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import http
from odoo.addons.lira.controllers import main


class LiraController(main.LiraController):
    @http.route([
        '/lira/git/<model("project.task"):task>/commits'
    ], type='json', auth='user')
    def load_commits(self, task):
        return task.commit_ids.format_commits()
