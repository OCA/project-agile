# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
from lxml import etree
from odoo import models


DEFAULT_ENCODING = 'utf-8'


class XmlAgileBoardWriter(models.AbstractModel):
    _name = 'project.agile.board.xml.writer'
    _description = 'Xml agile board xml writer'

    def write(self, board, stream, encoding=DEFAULT_ENCODING):
        """
        Converts given ``board`` object to the xml and then writes it down to the given ``stream`` object.
        :param board: The ``project.agile.board`` browse object to be written down to the given stream object.
        :param stream: This object represent any data stream object but it must have write method.
        :param encoding: Target encoding for xml string. If not provided default encoding will be ``utf-8``.
        """
        tree = self._build_xml(board, element_tree=True)
        tree.write(
            stream, encoding=encoding, xml_declaration=True, pretty_print=True
        )

    def to_string(self, board):
        """
        Gets xml string representation of the given ``workflow`` object.
        :param workflow: The ``project.workflow`` browse object to be converted to the xml string.
        :return: Returns xml string representation of the give ``workflow`` object.
        """
        return etree.tostring(
            self._get_xml(board),
            encoding=self.encoding, xml_declaration=True, pretty_print=True
        )

    def _build_xml(self, board, element_tree=False):
        """
        Builds xml out of given ``workflow`` object.
        :param workflow: The ``project.workflow`` browse object.
        :param element_tree: Boolean indicating whteter to wrap root element into ``ElementTree`` or not.
        :return: Returns workflow xml as a root element or as an element tree.
        """
        root = self.create_board_element(board)

        columnsElement = self.create_columns_element(root, board)
        for column in board.column_ids:
            columnElement = self.create_column_element(columnsElement, column)
            columnStusesElement = self.create_statuses_element(
                columnElement, column
            )
            for status in column.status_ids:
                self.create_status_element(columnStusesElement, status)

        return element_tree and etree.ElementTree(root) or root

    def create_board_element(self, board):
        """
        This method creates root workflow xml element.
        :param workflow: The ``project.workflow`` browse object.
        :return: Returns a new root workflow xml element.
        """
        attributes = self.prepare_board_attributes(board)
        return etree.Element('agile-board', attributes)

    def prepare_board_attributes(self, board):
        """
        This method prepares attribute values for a workflow element.
        :param state: The ``project.workflow`` browse object.
        :return: Returns dictionary with attribute values.
        """
        return {
            'name': board.name,
            'description': board.description or '',
            'type': board.type,
            'workflow': board.workflow_id.name,
            'is_default': str(board.is_default),
            'task_types': ",".join([x.name for x in board.task_type_ids])
        }

    def create_columns_element(self, parent, board):
        """
        This method creates state xml element.
        :param parent: The parent element of the new states element.
        :param workflow: The ``project.workflow`` browse object.
        :return: Returns a new state xml element.
        """
        attributes = self.prepare_columns_attributes(board)
        return etree.SubElement(parent, 'columns', attributes)

    def prepare_columns_attributes(self, board):
        """
        This method prepares attribute values for a ``states`` element.
        At the moment this method does nothing but it's added here for possible future usage.
        :param workflow: The ``project.workflow`` browse object.
        :return: Returns dictionary with attribute values.
        """
        return {}

    def create_column_element(self, parent, column):
        """
        This method creates state xml element.
        :param parent: The parent element of the new state element.
        :param state: The ``project.workflow.state`` browse object.
        :return: Returns a new state xml element.
        """
        attributes = self.prepare_column_attributes(column)
        columnElement = etree.SubElement(parent, 'column', attributes)
        return columnElement

    def prepare_column_attributes(self, column):
        """
        This method prepares attribute values for a state element.
        :param state: The ``project.workflow.state`` browse object.
        :return: Returns dictionary with attribute values.
        """
        values = {
            'name': column.name,
            'order': str(column.order),
        }

        return values

    def create_statuses_element(self, parent, column):
        """
        This method creates transition xml element.
        :param parent: The parent element of the new transition element.
        :param workflow: The ``project.workflow`` browse object.
        :return: Returns a new transition xml element.
        """
        attributes = self.prepare_statuses_attributes(column)
        return etree.SubElement(parent, 'statuses', attributes)

    def prepare_statuses_attributes(self, column):
        """
        This method prepares attribute values for a ``statuses`` element.
        At the moment this method does nothing but it's added here for possible future usage.
        :param workflow: The ``project.workflow`` browse object.
        :return: Returns dictionary with attribute values.
        """
        return {}

    def create_status_element(self, parent, status):
        """
        This method creates transition xml element.
        :param parent: The parent element of the new transition element.
        :param transition: The ``project.workflow.transition`` browse object.
        :return: Returns a new transition xml element.
        """
        values = self.prepare_status_attributes(status)
        return etree.SubElement(parent, 'status', values)

    def prepare_status_attributes(self, status):
        """
        This method prepares attribute values for a transition element.
        :param transition: The ``project.workflow.transition`` browse object.
        :return: Returns dictionary with attribute values.
        """
        values = {
            'wkf_state': status.name,
            'order': str(status.order),
        }

        return values
