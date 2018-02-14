# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from odoo import http
from odoo.addons.project_agile.controllers.main import AgileController


class KanbanController(AgileController):

    @http.route('/agile/web/data/kanban_board/<model("project.agile.board"):board>', type='json', auth='user')
    def kanban_board(self, board, **options):

        # check if board exists
        if not board.exists():
            return False

        project_id = False
        if "project_id" in options and options["project_id"]:
            project_id = options["project_id"]

        board_data = {
            "board": {
                "name": board.name,
                "kanban_backlog_column_status": {
                    "id": board.kanban_backlog_column_status_id.id,
                    "name": board.kanban_backlog_column_status_id.name,
                },
                "kanban_backlog_status": {
                    "id": board.kanban_backlog_status_id.id,
                    "name": board.kanban_backlog_status_id.name,
                },
                "projects": {},
                "task_types": board.kanban_task_type_ids.ids,
            },
            "workflow": self.prepare_workflow(board.workflow_id),
            "users": {},
        }

        # Find all columns and their statuses in this board
        stages_in_board = set()
        board_data['board']['columns'] = {}
        board_data['board']['status'] = {}
        for column in board.column_ids:
            board_data['board']['columns'][column.id] = self.prepare_column(column)
            for status in column.status_ids:
                board_data['board']['status'][status.id] = self.prepare_status(status, column)
                stages_in_board.add(status.stage_id.id)

        for project in board.project_ids:
            if not project_id or project_id and project_id == project.id:
                board_data['board']['projects'][project.id] = self.prepare_project(project)

        task_filter = self._prepare_kanban_task_filter(board_data, board)
        tasks_in_board_ids = http.request.env['project.task'].search(task_filter)
        board_data['ids'] = tasks_in_board_ids.ids

        return board_data

    def _prepare_kanban_task_filter(self, board_data, board):
        task_filter = [
            ("project_id", "in", list(board_data['board']['projects'].keys())),
            ("stage_id", "in", [x.stage_id.id for x in board.status_ids]),
        ]

        if board.kanban_task_type_ids:
            task_filter.append((
                'type_id', 'in', board.kanban_task_type_ids.ids
            ))
        return task_filter
