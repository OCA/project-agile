# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).

import os
import logging
from lxml import etree
from lxml.builder import ElementMaker
from odoo import models, tools, exceptions, _

_logger = logging.getLogger(__name__)


class XmlAgileBoardReader(models.AbstractModel):
    _name = 'project.agile.board.xml.reader'
    _description = 'Agile Board Xml Reader'

    _rng_namespace = 'http://relaxng.org/ns/structure/1.0'
    _rng_namespace_map = {'rng': 'http://relaxng.org/ns/structure/1.0'}

    def get_element_maker(self):
        return ElementMaker(
            namespace=self._rng_namespace,
            nsmap=self._rng_namespace_map,
        )

    def validate_schema(self, xml):
        """
        Validates given ``xml`` against RelaxedNG validation schema.
        In case xml is invalid and ~openerp.exceptions.ValidationError is raised.
        :param xml: Xml string to be validated against RelaxedNG schema
        :return: Void
        """
        validator = self.create_validator()
        if not validator.validate(xml):
            errors = []
            for error in validator.error_log:
                error = tools.ustr(error)
                _logger.error(error)
                errors.append(error)
            raise exceptions.ValidationError(_("Agile Board File Validation Error: %s" % ",".join(errors)))

    def create_validator(self):
        """
        Instantiates RelaxedNG schema validator
        :return: Returns RelaxedNG validator
        """
        rng_file = tools.file_open(self.get_rng_file_path())
        try:
            rng = etree.parse(rng_file)
            rng = self.extend_rng(rng)
            return etree.RelaxNG(rng)
        except Exception:
            raise
        finally:
            rng_file.close()

    def extend_rng(self, rng_etree):
        """
        This method is a hook from where you can modify rng schema in cases where you have extended agile board
        from another module and you want to support import/export functionality for your extensions.
        :param rng_etree: The tng tree which needs to be extended.
        :return: Returns extended rng tree.
        """
        return rng_etree

    def get_rng_file_path(self):
        return os.path.join('project_agile', 'rng', 'board.rng')

    def read(self, stream):
        """
        Reads workflow from the given xml string
        :param stream: The stream providing xml data
        :return: Returns parsed workflow data.
        """

        board_tree = etree.parse(stream)
        self.validate_schema(board_tree)

        board_xml = board_tree.getroot()

        board = self.read_board(board_xml)
        self.validate_board(board)

        return board

    def validate_board(self, board):
        """
        This method validates the logic of the given agile board object.
        It will check if all mapped states within columns are used only once
        :param board: The agile board to be validated
        :return:
        """

        workflows = self.env['project.workflow'].search([
            ('name', '=', board['workflow'])
        ])

        workflow_count = len(workflows)
        if workflow_count == 0:
            raise exceptions.ValidationError(
                _("Workflow with name '%s' could not be found in database" % board['workflow']))

        if workflow_count > 1:
            raise exceptions.ValidationError(
                _("Found multiple instances of workflow with name '%s' " % board['workflow']))

        wkf_states = set([state.name for state in workflows.state_ids])

        counter = dict()
        multiples = []
        lost_and_found = set()
        for column in board['columns']:
            for status in column['statuses']:
                status_name = status['wkf_state']
                counter[status_name] = counter.get(status_name, 0) + 1
                if counter[status_name] > 1:
                    multiples.append(status_name)

                if status_name not in wkf_states:
                    lost_and_found.add(status_name)

        error_messages = []

        if multiples:
            error_messages.append(_("Following states: [%s] are assigned to multiple columns!" % multiples))

        if lost_and_found:
            error_messages.append(
                _("Following states [%] are referenced in the board but are not found in the related workflow!"
                  % lost_and_found)
            )

        if error_messages:
            raise exceptions.ValidationError("\n".join(error_messages))

    def read_board(self, element):
        """
        Reads workflow data out of the given xml element.
        :param element: The xml element which holds information about project workflow.
        :return: Returns workflow dictionary.
        """
        return {
            'name': self.read_string(element, 'name'),
            'description': self.read_string(element, 'description'),
            'type': self.read_string(element, 'type'),
            'is_default': self.read_boolean(element, 'is_default'),
            'columns': self.read_columns(element),
            'workflow': self.read_string(element, 'workflow'),
        }

    def read_columns(self, element):
        """
        Reads workflow states data out of the given xml element.
        :param element: The xml element which holds information about project workflow states
        :return: Returns the list of the workflow states
        """
        columns = []
        for e in element.iterfind('columns/column'):
            columns.append(self.read_column(e))
        return columns

    def read_column(self, element):
        """
        Reads workflow state data out of the given xml element.
        :param element: The xml element which holds information about project workflow state
        :return: Returns workflow state dictionary
        """
        return {
            'name': self.read_string(element, 'name'),
            'statuses': self.read_column_statuses(element),
            'order': self.read_integer(element, 'sequence', default_value=10)
        }

    def read_column_statuses(self, element):
        """
        Reads workflow transitions data out of the given xml element.
        :param element: The xml element which holds information about project workflow transitions.
        :return: Returns the list of the workflow transitions.
        """
        stauses = []
        for e in element.iterfind('statuses/status'):
            stauses.append(self.read_status(e))
        return stauses

    def read_status(self, element):
        """
        Reads ``project.workflow.transition`` data out of the given xml element.
        :param element: The xml element which holds information about project workflow transition.
        :return: Returns workflow transition dictionary.
        """
        return {
            'wkf_state': self.read_string(element, 'wkf_state'),
            'order': self.read_float(element, 'order'),
        }

    def read_string(self, element, attribute_name, default_value=''):
        """
        Reads attribute of type ``string`` from the given xml element.
        :param element: The xml element from which the attribute value is read.
        :param attribute_name: The name of the xml attribute.
        :param default_value: The default value in case the attribute is not present within xml element.
        :return: Returns attribute value of type ``string``
        """
        return self.read_attribute(element, attribute_name, default_value)

    def read_integer(self, element, attribute_name, default_value=0):
        """
        Reads attribute of type ``integer`` from the given xml element.
        :param element: The xml element from which the attribute value is read.
        :param attribute_name: The name of the xml attribute.
        :param default_value: The default value in case the attribute is not present within xml element.
        :return: Returns attribute value of type ``integer``.
        """
        return int(self.read_attribute(element, attribute_name, default_value))

    def read_float(self, element, attribute_name, default_value=0):
        """
        Reads attribute of type ``integer`` from the given xml element.
        :param element: The xml element from which the attribute value is read.
        :param attribute_name: The name of the xml attribute.
        :param default_value: The default value in case the attribute is not present within xml element.
        :return: Returns attribute value of type ``integer``.
        """
        return float(self.read_attribute(element, attribute_name, default_value))

    def read_boolean(self, element, attribute_name, default_value=False):
        """
        Reads attribute of type ``boolean`` from the given xml element.
        :param element: The xml element from which the attribute value is read.
        :param attribute_name: The name of the xml attribute.
        :param default_value: The default value in case the attribute is not present within xml element.
        :return: Returns attribute value of type ``boolean``.
        """
        return bool(self.read_attribute(element, attribute_name, default_value))

    def read_attribute(self, element, name, default_value=None):
        """
        Reads attribute value of the given ``name`` from the given xml element.
        :param element: The xml element from which attribute.
        :param name: The name of the attribute.
        :param default_value: The default value in case the attribute is not present within xml element.
        :return: Returns attribute value or the default value.
        """
        return element.attrib.get(name, default_value)

