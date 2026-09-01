# Copyright 2018 Therp BV <http://therp.nl>
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
import logging

from odoo import SUPERUSER_ID, fields, models
from odoo.tests.common import TransactionCase

_logger = logging.getLogger(__name__)


class TestProjectScrum(TransactionCase):

    post_install = True

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.project_project_obj = cls.env["project.project"]
        cls.project_scrum_sprint_obj = cls.env["project.scrum.sprint"]
        cls.project_task_obj = cls.env["project.task"]

    def test_crud_operations(self):
        _logger.debug("Testing CRUD operations on the models of project_scrum")
        self._test_create()
        self._test_get_formview_id()
        self._test_read()
        self._test_assertions()
        self._test_write()
        self._test_unlink()

    def _test_create(self):
        _logger.debug("Testing create operations")
        self.project_project_vals = {
            "name": "test",
            "use_scrum": True,
            "default_sprintduration": 20,
            "manhours": 17,
            "alias_name": "project",
            "privacy_visibility": "followers",
            "description": "<p>Description</p>",
        }
        self.project_project = self.project_project_obj.create(
            self.project_project_vals,
        )
        self.project_scrum_sprint_vals = {
            "name": "Name",
            "user_id": SUPERUSER_ID,
            "date_start": fields.Date.today(),
            "date_stop": fields.Date.today(),
            "description": "Description",
            "project_id": self.project_project.id,
            "sequence": 123,
            "planned_hours": 14,
            "state": "open",
        }
        self.project_scrum_sprint = self.project_scrum_sprint_obj.create(
            self.project_scrum_sprint_vals,
        )
        self.project_task_vals = {
            "name": "A Task",
            "user_id": SUPERUSER_ID,
            "sprint_id": self.project_scrum_sprint.id,
            "description": "<p>Description</p>",
        }
        self.project_task = self.project_task_obj.create(
            self.project_task_vals,
        )

    def _test_get_formview_id(self):
        self.project_task.write({"project_id": self.project_project.id})
        self.assertEqual(
            self.project_task.get_formview_id(),
            self.env.ref("project_scrum.view_ps_sprint_task_form2").id,
        )
        self.project_project.write({"use_scrum": False})
        self.assertNotEqual(
            self.project_task.get_formview_id(),
            self.env.ref("project_scrum.view_ps_sprint_task_form2").id,
        )
        # reset data as before testing function
        self.project_project.write({"use_scrum": True})

    def _test_read(self):
        _logger.debug("Testing read")
        for key in self.project_project_vals.keys():
            attr = getattr(self.project_project, key)
            if issubclass(type(attr), models.Model):
                attr = attr.id
            self.assertEqual(
                attr,
                self.project_project_vals[key],
            )
        for key in self.project_scrum_sprint_vals.keys():
            attr = getattr(self.project_scrum_sprint, key)
            if issubclass(type(attr), models.Model):
                attr = attr.id
            self.assertEqual(
                attr,
                self.project_scrum_sprint_vals[key],
            )
        for key in filter(
            lambda x: x not in ["message_follower_ids", "code", "display_project_id"],
            self.project_task_vals.keys(),
        ):
            attr = getattr(self.project_task, key)
            if issubclass(type(attr), models.Model):
                attr = attr.id
            self.assertEqual(
                attr,
                self.project_task_vals[key],
            )

    def _test_assertions(self):
        _logger.debug("Testing assertions")
        self.assertEqual(self.project_scrum_sprint.task_count, 1)
        self.assertEqual(self.project_project.sprint_count, 1)

    def _test_write(self):
        _logger.debug("Testing write")
        self.project_project.write(self.project_project_vals)
        self.project_scrum_sprint.write(self.project_scrum_sprint_vals)
        self.project_task.write(self.project_task_vals)

    def _test_unlink(self):
        _logger.debug("Testing unlinks")
        self.assertEqual(self.project_scrum_sprint.unlink(), True)
        self.assertEqual(self.project_task.unlink(), True)
        self.assertEqual(self.project_project.unlink(), True)
