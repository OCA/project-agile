# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

from lxml import etree
from odoo import models


class XmlWorkflowWriter(models.AbstractModel):
    _inherit = 'project.workflow.xml.writer'

    def create_transition_task_types_element(self, parent, transition):
        """
        This method creates groups xml element.
        :param parent: The parent element of the new groups element.
        :param transition: The ``project.workflow`` browse object.
        :return: Returns a new groups xml element.
        """
        attributes = self.prepare_security_groups_attributes(transition)
        return etree.SubElement(parent, 'task-types', attributes)

    def prepare_transition_task_types_attributes(self, transition):
        """
        This method prepares attribute values for a ``transitions`` element.
        At the moment this method does nothing but it's added here
        for possible future usage.
        :param transition: The ``project.workflow`` browse object.
        :return: Returns dictionary with attribute values.
        """
        return {}

    def create_transition_task_type_element(self, parent, group):
        """
        This method creates transition xml element.
        :param parent: The parent element of the new transition element.
        :param group: The ``project.workflow.transition`` browse object.
        :return: Returns a new transition xml element.
        """
        values = self.prepare_transition_task_type_attributes(group)
        return etree.SubElement(parent, 'task-type', values)

    def prepare_transition_task_type_attributes(self, task_type):
        """
        This method prepares attribute values for a transition element.
        :return: Returns dictionary with attribute values.
        """
        values = {
            'name': task_type.name,
        }

        return values

    def create_transition_element(self, parent, transition):
        transition_element = super(XmlWorkflowWriter, self)\
            .create_transition_element(parent, transition)
        task_types_element = self.create_transition_task_types_element(
            transition_element, transition
        )

        for task_type in transition.task_type_ids:
            self.create_transition_task_type_element(
                task_types_element, task_type
            )

        return transition_element
