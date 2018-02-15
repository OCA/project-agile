# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
from odoo import http, fields, exceptions, _
from odoo.http import request

from odoo.addons.project_agile.controllers.main import AgileController


class ScrumController(AgileController):
    @http.route([
        '/agile/web/data/sprint/<model("project.agile.scrum.sprint"):sprint>/start'
    ], type='json', auth='user')
    def sprint_start(self, sprint, start_date, end_date):
        sprint.write({
            'state': 'active',
            'start_date': start_date,
            'end_date': end_date
        })

        return {
            'state': 'active',
            'start_date': sprint.start_date,
            'end_date': sprint.end_date,
        }

    @http.route([
        '/agile/web/data/sprint/<model("project.agile.scrum.sprint"):sprint>/stop',
        ], type='json', auth='user')
    def sprint_stop(self, sprint):
        # Mark sprint as done
        sprint.write({
            'state': 'completed',
            'actual_end_date': fields.Datetime.now()
        })

        # Remove unfinished tasks from the sprint

        # First we record all sprint tasks for this sprint
        sprint.task_ids.write({"sprint_ids": [(4, sprint.id)]})

        # Then we remove the un-done tasks from the sprint
        sprint.task_ids.filtered(lambda t: t.wkf_state_type != "done").write({
            "sprint_id": False
        })

        return {
            'state': sprint.state,
            'actual_end_date': sprint.actual_end_date,
        }

    @http.route('/agile/web/data/sprint/create', type='json', auth='user')
    def sprint_create(self, sprint):
        env = request.env()

        team = env.user.team_id
        if team:
            sprint['team_id'] = team.id
        else:
            raise exceptions.ValidationError(_(
                "You have to be part of an agile team "
                "in order to create new sprint"
            ))

        sprint = env['project.agile.scrum.sprint'].create(sprint)
        data = sprint.read()[0]

        return data

    @http.route([
        '/agile/web/data/active_sprints/<model("project.agile.board"):board>',
    ], type='json', auth='user')
    def active_sprints(self, board, **options):
        # check if board exists
        if not board.exists():
            return False

        project_id = False
        if "project_id" in options and options["project_id"]:
            project_id = options["project_id"]

        board_data = {
            "board": {
                "name": board.name,
                "projects": {},
                "task_types": board.scrum_task_type_ids.ids,
            },
            "workflow": self.prepare_workflow(board.workflow_id),
            "active_sprints": {},
            "users": {},
            "ids": [],
        }

        # Find all columns and their statuses in this board
        stages_in_board = set()
        board_data['board']['columns'] = {}
        board_data['board']['status'] = {}
        for column in board.column_ids:
            board_data['board']['columns'][column.id] = self.prepare_column(
                column
            )
            for status in column.status_ids:
                board_data['board']['status'][status.id] = self.prepare_status(
                    status, column
                )
                stages_in_board.add(status.stage_id.id)

        for project in board.project_ids:
            if not project_id or project_id and project_id == project.id:
                board_data['board']['projects'][project.id] =\
                    self.prepare_project(project)

        active_sprint = request.env.user.team_id.active_sprint_id
        if active_sprint:
            board_data['active_sprints'][active_sprint.id] = \
                self.prepare_active_sprint(active_sprint)

            task_filter = self._prepare_sprint_task_filter(
                active_sprint, board_data, list(stages_in_board), board
            )
            tasks_in_board = http.request.env['project.task'].search(
                task_filter
            )

            task_users = tasks_in_board.mapped("user_id")
            for task_user in task_users:
                board_data['users'][task_user.id] = self.prepare_user(task_user)

            board_data['ids'] = tasks_in_board.ids
        return board_data

    def _prepare_sprint_task_filter(self, active_sprint, board_data,
                                    stages_in_board, board):
        task_filter = [
            ('sprint_id', '=', active_sprint.id),
            ('stage_id', 'in', stages_in_board),
            ('project_id', 'in', list(board_data['board']['projects'].keys()))
        ]

        if board.scrum_task_type_ids:
            task_filter.append((
                'type_id', 'in', board.scrum_task_type_ids.ids
            ))

        return task_filter

    def prepare_task(self, task):
        task_data = super(ScrumController, self).prepare_task(task)
        task_data.update({
            'sprint_id': task.sprint_id.id,
        })
        return task_data

    def prepare_active_sprint(self, sprint):
        return {
            'id': sprint.id,
            'name': sprint.name,
        }

    def get_security_models(self):
        result = super(ScrumController, self).get_security_models()
        result.append("project.agile.scrum.sprint")
        return result

    def prepare_user_team(self, team):
        result = super(ScrumController, self).prepare_user_team(team)
        result["sprint_ids"] = team.sprint_ids.filtered(
            lambda x: x.state != "completed"
        ).ids
        return result
