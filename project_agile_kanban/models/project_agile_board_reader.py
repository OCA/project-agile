# Copyright 2017 - 2018 Modoolar <info@modoolar.com>
# License LGPLv3.0 or later (https://www.gnu.org/licenses/lgpl-3.0.en.html).
from odoo import models, exceptions, _



class XmlAgileBoardReader(models.AbstractModel):
    _inherit = 'project.agile.board.xml.reader'


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

    def extend_rng(self, rng_etree):
        rng_etree = super(XmlAgileBoardReader, self).extend_rng(rng_etree)
        root = rng_etree.getroot()

        root.insert(0, self.rng_define_task_types())

        transition = root.xpath(
            "//rng:define[@name='transition']//rng:element[@name='transition']",
            namespaces=self._rng_namespace_map
        )[0]

        transition.append(self.rng_task_type_element())
        return rng_etree

    def rng_define_task_types(self):
        E = self.get_element_maker()

        doc = E.grammar(
            E.define(
                name('task-type'),
                E.element(
                    name('task-type'),
                    E.attribute(
                        name('name'),
                        E.text()
                    )
                )
            )
        )
        return doc[0]

    def rng_task_type_element(self):
        E = self.get_element_maker()
        doc = E.grammar(
            E.optional(
                E.element(
                    name('task-types'),
                    E.optional(
                        E.oneOrMore(
                            E.ref(
                                name("task-type")
                            )
                        )
                    )
                )
            )
        )
        return doc[0]

