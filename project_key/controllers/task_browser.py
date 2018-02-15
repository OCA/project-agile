# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

import werkzeug
import odoo.http as http
from odoo.http import request


class TaskBrowser(http.Controller):

    def get_task_url(self, key):
        env = request.env()

        Task = env['project.task']
        tasks = Task.search([('key', '=ilike', key)])
        task_action = env.ref('project.action_view_task')

        url = "/web#id=%s&view_type=form&model=project.task&action=%s"
        return url % (tasks and tasks.id or -1, task_action.id)

    def get_project_url(self, key):
        env = request.env()

        Project = env['project.project']
        projects = Project.search([('key', '=ilike', key)])
        if not projects.exists():
            return False

        url = "/web#id=%s&view_type=form&model=project.project&action=%s"
        project_action = env.ref('project.open_view_project_all_config')
        return url % (projects and projects.id or -1, project_action.id)

    @http.route([
        '/browse/<string:key>',
        '/web/browse/<string:key>',
    ], type='http', auth="user")
    def open(self, key, **kwargs):
        redirect_url = self.get_project_url(key)
        if not redirect_url:
            redirect_url = self.get_task_url(key)
        return werkzeug.utils.redirect(redirect_url or '', 301)
